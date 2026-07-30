import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { CashRegisterService } from './cash-register.service';
import { CashMovementDto } from './dto/cash-movement.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';

// Quem entra é decidido pelas permissões concedidas pelo dono — o @Roles
// aqui só barra papéis de fora do estabelecimento.
@Roles(...ESTABLISHMENT_ROLES)
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cash: CashRegisterService) {}

  // Alimenta o badge "Caixa: Aberto/Fechado" da barra superior. Traz valor de
  // abertura e operador, então exige a permissão financeira.
  @Get('current')
  @Permissions('financeiro')
  current(@CurrentUser('establishmentId') establishmentId: string) {
    return this.cash.getCurrent(establishmentId);
  }

  @Post('open')
  @Permissions('caixa.abrir_fechar')
  @HttpCode(HttpStatus.CREATED)
  open(
    @CurrentUser('establishmentId') establishmentId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: OpenCashRegisterDto,
  ) {
    return this.cash.open(establishmentId, userId, dto.openingAmount);
  }

  @Post('close')
  @Permissions('caixa.abrir_fechar')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CloseCashRegisterDto,
  ) {
    return this.cash.close(establishmentId, dto.countedAmount);
  }

  @Post('movements')
  @Permissions('caixa.movimentacao')
  @HttpCode(HttpStatus.CREATED)
  movement(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CashMovementDto,
  ) {
    return this.cash.addMovement(establishmentId, dto);
  }
}
