import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { TransferTabDto } from '../tabs/dto/transfer-tab.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { TablesService } from './tables.service';

@Controller()
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get('tables')
  findAllTables(@CurrentUser('establishmentId') establishmentId: string) {
    return this.tables.findAllTables(establishmentId);
  }

  @Get('room-areas')
  findRoomAreas(@CurrentUser('establishmentId') establishmentId: string) {
    return this.tables.findRoomAreas(establishmentId);
  }

  // Move a comanda para uma mesa livre.
  @Post('tables/:id/transfer')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('mesas')
  transfer(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferTabDto,
  ) {
    return this.tables.transfer(establishmentId, id, dto.toTableId);
  }

  // Junta esta mesa na de destino: uma conta só.
  @Post('tables/:id/merge')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('mesas')
  merge(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferTabDto,
  ) {
    return this.tables.merge(establishmentId, id, dto.toTableId);
  }

  // ---- Gestão (admin/gerente) ----

  @Post('room-areas')
  @Roles(Role.ADMIN, Role.MANAGER)
  createArea(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateAreaDto,
  ) {
    return this.tables.createArea(establishmentId, dto.name);
  }

  @Delete('room-areas/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  deleteArea(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tables.deleteArea(establishmentId, id);
  }

  @Post('tables')
  @Roles(Role.ADMIN, Role.MANAGER)
  createTable(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.tables.createTable(establishmentId, dto.roomAreaId, dto.number);
  }

  @Delete('tables/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  deleteTable(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tables.deleteTable(establishmentId, id);
  }
}
