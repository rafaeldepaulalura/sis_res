import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll(@CurrentUser('establishmentId') establishmentId: string) {
    return this.categories.findAll(establishmentId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categories.findOne(establishmentId, id);
  }

  @Post()
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('produtos')
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(establishmentId, dto);
  }

  @Patch(':id')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('produtos')
  update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(establishmentId, id, dto);
  }

  @Delete(':id')
  @Roles(...ESTABLISHMENT_ROLES)
  @Permissions('produtos')
  remove(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categories.remove(establishmentId, id);
  }
}
