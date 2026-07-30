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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Listagem (somente leitura) — usada também pelo Balcão para escolher o atendente.
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER)
  findAll(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query('role') role?: Role,
  ) {
    return this.users.findAll(establishmentId, role);
  }

  @Post()
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('configuracoes')
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.create(establishmentId, dto);
  }

  @Patch(':id')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('configuracoes')
  update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(establishmentId, id, dto);
  }
}
