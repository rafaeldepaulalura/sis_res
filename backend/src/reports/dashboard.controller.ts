import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES, hasPermission } from '../auth/permissions';
import { AuthUser } from '../auth/types/auth.types';
import { DashboardService } from './dashboard.service';

// Tela inicial. Todo mundo que trabalha no restaurante pode abrir, mas os
// números de faturamento só saem para quem tem a permissão de relatórios —
// o garçom vê a operação, não o quanto a casa fez no dia.
@Roles(...ESTABLISHMENT_ROLES)
@Permissions('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.dashboard.overview(
      user.establishmentId as string,
      hasPermission(user, ['relatorios']),
    );
  }
}
