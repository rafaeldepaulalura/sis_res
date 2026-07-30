import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { runBypass } from '../../prisma/tenant-context';
import { AuthUser, JwtPayload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // Revalida no banco a cada request: garante que o usuário ainda existe/ativo.
  // Roda em bypass: acontece antes do contexto de tenant estar montado.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await runBypass(() =>
      this.prisma.user.findUnique({ where: { id: payload.sub } }),
    );
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }
    return {
      userId: user.id,
      establishmentId: user.establishmentId,
      resellerId: user.resellerId,
      role: user.role,
      email: user.email,
      permissions: user.permissions,
    };
  }
}
