import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { TabsReportQueryDto } from './dto/tabs-report-query.dto';
import { ReportsService } from './reports.service';

// Faturamento do restaurante: só quem tem a permissão "relatorios".
@Roles(...ESTABLISHMENT_ROLES)
@Permissions('relatorios')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales')
  sales(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query() query: SalesReportQueryDto,
  ) {
    return this.reports.sales(establishmentId, query);
  }

  @Get('waiters')
  waiters(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query() query: SalesReportQueryDto,
  ) {
    return this.reports.waiters(establishmentId, query);
  }

  @Get('tabs')
  tabsOfDay(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query() query: TabsReportQueryDto,
  ) {
    return this.reports.tabsOfDay(establishmentId, query);
  }
}
