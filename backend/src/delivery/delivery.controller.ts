import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { DeliveryService } from './delivery.service';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';
import {
  UpdateDeliverySettingsDto,
  UpsertZoneDto,
} from './dto/delivery-settings.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Roles(...ESTABLISHMENT_ROLES)
@Permissions('delivery')
@Controller('delivery-orders')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  findAll(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query('status') status?: DeliveryStatus,
    @Query('courierId') courierId?: string,
  ) {
    return this.delivery.findAll(establishmentId, { status, courierId });
  }

  // Pedidos fechados elegíveis para virar entrega.
  @Get('eligible-orders')
  eligible(@CurrentUser('establishmentId') establishmentId: string) {
    return this.delivery.eligibleOrders(establishmentId);
  }

  // ---- Configuração de taxa e bairros ----

  @Get('settings')
  getSettings(@CurrentUser('establishmentId') establishmentId: string) {
    return this.delivery.getSettings(establishmentId);
  }

  @Patch('settings')
  @Permissions('configuracoes')
  updateSettings(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: UpdateDeliverySettingsDto,
  ) {
    return this.delivery.updateSettings(establishmentId, dto);
  }

  @Put('settings/zones')
  @Permissions('configuracoes')
  upsertZone(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: UpsertZoneDto,
  ) {
    return this.delivery.upsertZone(establishmentId, dto);
  }

  @Delete('settings/zones/:id')
  @Permissions('configuracoes')
  removeZone(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.delivery.removeZone(establishmentId, id);
  }

  // Comandas do PDV (balcão/mesa) marcadas como delivery — ainda não viraram
  // Order/DeliveryOrder formal (só ao fechar a comanda).
  @Get('tabs')
  activeTabDeliveries(@CurrentUser('establishmentId') establishmentId: string) {
    return this.delivery.activeTabDeliveries(establishmentId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.delivery.findOne(establishmentId, id);
  }

  @Post()
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateDeliveryOrderDto,
  ) {
    return this.delivery.create(establishmentId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.delivery.updateStatus(establishmentId, id, dto.status);
  }

  @Patch(':id/assign-courier')
  assignCourier(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCourierDto,
  ) {
    return this.delivery.assignCourier(establishmentId, id, dto.courierId);
  }
}
