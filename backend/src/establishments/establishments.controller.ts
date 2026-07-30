import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { UpdateEstablishmentBrandingDto } from './dto/update-establishment-branding.dto';
import { EstablishmentsService } from './establishments.service';

@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishments: EstablishmentsService) {}

  // Marca do restaurante (nome, logo, cor). Todo funcionário precisa ler para
  // o PDV aparecer personalizado — não devolve nada sensível.
  @Get('me')
  @Roles(...ESTABLISHMENT_ROLES)
  findMe(@CurrentUser('establishmentId') establishmentId: string) {
    return this.establishments.findMe(establishmentId);
  }

  // Alterar a marca é coisa de quem administra o restaurante.
  @Patch('me')
  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions('configuracoes')
  updateBranding(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: UpdateEstablishmentBrandingDto,
  ) {
    return this.establishments.updateBranding(establishmentId, dto);
  }
}
