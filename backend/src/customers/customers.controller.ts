import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// "comandas"/"delivery" também liberam: cadastrar cliente faz parte de
// montar um pedido de entrega (ver DeliveryAddressPicker).
@Roles(...ESTABLISHMENT_ROLES)
@Permissions('clientes', 'comandas', 'delivery')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query('search') search?: string,
  ) {
    return this.customers.findAll(establishmentId, search);
  }

  @Get(':id')
  findOne(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customers.findOne(establishmentId, id);
  }

  @Post()
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(establishmentId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(establishmentId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customers.remove(establishmentId, id);
  }

  // ---- Endereços ----

  @Get(':id/addresses')
  listAddresses(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customers.listAddresses(establishmentId, id);
  }

  @Post(':id/addresses')
  createAddress(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customers.createAddress(establishmentId, id, dto);
  }

  @Patch(':id/addresses/:addressId')
  updateAddress(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customers.updateAddress(establishmentId, id, addressId, dto);
  }

  @Delete(':id/addresses/:addressId')
  removeAddress(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.customers.removeAddress(establishmentId, id, addressId);
  }
}
