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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import {
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  SetProductGroupsDto,
  UpdateModifierGroupDto,
  UpdateModifierOptionDto,
} from './dto/modifier.dto';
import { ModifiersService } from './modifiers.service';

// Complementos do cardápio. Leitura livre para a equipe (o PDV precisa para
// montar o pedido); alterar é parte de cuidar do cardápio.
@Roles(...ESTABLISHMENT_ROLES)
@Controller('modifier-groups')
export class ModifiersController {
  constructor(private readonly modifiers: ModifiersService) {}

  @Get()
  findAll(@CurrentUser('establishmentId') establishmentId: string) {
    return this.modifiers.findAll(establishmentId);
  }

  @Post()
  @Permissions('produtos')
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateModifierGroupDto,
  ) {
    return this.modifiers.create(establishmentId, dto);
  }

  @Patch(':id')
  @Permissions('produtos')
  update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.modifiers.update(establishmentId, id, dto);
  }

  @Delete(':id')
  @Permissions('produtos')
  remove(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.modifiers.remove(establishmentId, id);
  }

  // ---- Opções do grupo ----

  @Post(':id/options')
  @Permissions('produtos')
  addOption(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return this.modifiers.addOption(establishmentId, id, dto);
  }

  @Patch(':id/options/:optionId')
  @Permissions('produtos')
  updateOption(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateModifierOptionDto,
  ) {
    return this.modifiers.updateOption(establishmentId, id, optionId, dto);
  }

  @Delete(':id/options/:optionId')
  @Permissions('produtos')
  removeOption(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
  ) {
    return this.modifiers.removeOption(establishmentId, id, optionId);
  }
}

// Quais grupos cada produto usa.
@Roles(...ESTABLISHMENT_ROLES)
@Controller('products/:productId/modifier-groups')
export class ProductModifiersController {
  constructor(private readonly modifiers: ModifiersService) {}

  @Get()
  get(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.modifiers.getProductGroups(establishmentId, productId);
  }

  @Put()
  @Permissions('produtos')
  set(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetProductGroupsDto,
  ) {
    return this.modifiers.setProductGroups(establishmentId, productId, dto);
  }
}
