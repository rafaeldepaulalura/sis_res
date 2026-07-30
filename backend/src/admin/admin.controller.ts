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
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { SetResellerAdminDto } from './dto/set-reseller-admin.dto';
import { ChangePlanDto, UpdateResellerDto } from './dto/update-reseller.dto';

// Painel do Super Admin — visão global, fora de qualquer establishment.
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('plans')
  listPlans() {
    return this.admin.listPlans();
  }

  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.admin.createPlan(dto);
  }

  @Get('resellers')
  listResellers() {
    return this.admin.listResellers();
  }

  @Post('resellers')
  createReseller(@Body() dto: CreateResellerDto) {
    return this.admin.createReseller(dto);
  }

  @Patch('resellers/:id')
  updateReseller(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResellerDto,
  ) {
    return this.admin.updateReseller(id, dto);
  }

  // Cria o acesso do revendedor ou troca a senha.
  @Put('resellers/:id/admin')
  setResellerAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetResellerAdminDto,
  ) {
    return this.admin.setResellerAdmin(id, dto);
  }

  @Delete('resellers/:id')
  deleteReseller(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteReseller(id);
  }

  @Patch('resellers/:id/plan')
  changePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.admin.changePlan(id, dto);
  }

  @Get('metrics')
  metrics() {
    return this.admin.metrics();
  }
}
