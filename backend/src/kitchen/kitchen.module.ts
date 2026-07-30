import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KitchenController } from './kitchen.controller';
import { KitchenGateway } from './kitchen.gateway';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenGateway],
  exports: [KitchenGateway],
})
export class KitchenModule {}
