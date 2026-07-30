import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { PublicCourierController } from './public-courier.controller';

@Module({
  controllers: [DeliveryController, PublicCourierController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
