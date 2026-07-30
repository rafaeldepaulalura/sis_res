import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { PinCheckDto } from './dto/pin-check.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUser } from './types/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('pin-check')
  @HttpCode(HttpStatus.OK)
  pinCheck(@CurrentUser() user: AuthUser, @Body() dto: PinCheckDto) {
    return this.auth.checkPin(user.userId, dto.pin);
  }

  // Retorna o usuário autenticado (útil para o frontend restaurar a sessão).
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const found = await runBypass(() =>
      this.prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          establishmentId: true,
          resellerId: true,
        },
      }),
    );
    return found;
  }
}
