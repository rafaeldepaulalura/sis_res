import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';

@Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
@Controller('couriers')
export class CouriersController {
  constructor(private readonly couriers: CouriersService) {}

  @Get()
  findAll(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query('available') available?: string,
  ) {
    return this.couriers.findAll(establishmentId, available === 'true');
  }

  @Post()
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateCourierDto,
  ) {
    return this.couriers.create(establishmentId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourierDto,
  ) {
    return this.couriers.update(establishmentId, id, dto);
  }
}
