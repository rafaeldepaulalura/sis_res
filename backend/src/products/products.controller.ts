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
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(
    @CurrentUser('establishmentId') establishmentId: string,
    @Query() query: GetProductsQueryDto,
  ) {
    return this.products.findAll(establishmentId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.findOne(establishmentId, id);
  }

  @Post()
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('produtos')
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(establishmentId, dto);
  }

  @Patch(':id')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('produtos')
  update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(establishmentId, id, dto);
  }

  @Delete(':id')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('produtos')
  remove(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.remove(establishmentId, id);
  }
}
