import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { DeliveryService } from './delivery.service';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

// PWA do motoboy — acesso por link com o courierId (sem login).
// Nota: em produção, trocar por token/magic-link por entregador.
@Public()
@Controller('public/courier')
export class PublicCourierController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get(':courierId')
  deliveries(@Param('courierId', ParseUUIDPipe) courierId: string) {
    return this.delivery.courierDeliveries(courierId);
  }

  @Patch(':courierId/deliveries/:id/status')
  updateStatus(
    @Param('courierId', ParseUUIDPipe) courierId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.delivery.courierUpdateStatus(courierId, id, dto.status);
  }
}
