import { Module } from '@nestjs/common';
import {
  ModifiersController,
  ProductModifiersController,
} from './modifiers.controller';
import { ModifiersService } from './modifiers.service';

@Module({
  controllers: [ModifiersController, ProductModifiersController],
  providers: [ModifiersService],
})
export class ModifiersModule {}
