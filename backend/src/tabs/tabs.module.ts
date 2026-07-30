import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { PrintingModule } from '../printing/printing.module';
import { TabsController } from './tabs.controller';
import { TabsService } from './tabs.service';

@Module({
  imports: [AuthModule, CashRegisterModule, KitchenModule, PrintingModule],
  controllers: [TabsController],
  providers: [TabsService],
  exports: [TabsService],
})
export class TabsModule {}
