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
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { ResellerService } from './reseller.service';

// Painel do revendedor — escopado pelo resellerId do usuário autenticado.
@Roles(Role.RESELLER_ADMIN)
@Controller('reseller')
export class ResellerController {
  constructor(private readonly reseller: ResellerService) {}

  @Get('establishments')
  listEstablishments(@CurrentUser('resellerId') resellerId: string) {
    return this.reseller.listEstablishments(resellerId);
  }

  @Post('establishments')
  createEstablishment(
    @CurrentUser('resellerId') resellerId: string,
    @Body() dto: CreateEstablishmentDto,
  ) {
    return this.reseller.createEstablishment(resellerId, dto);
  }

  @Patch('establishments/:id')
  updateEstablishment(
    @CurrentUser('resellerId') resellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstablishmentDto,
  ) {
    return this.reseller.updateEstablishment(resellerId, id, dto);
  }

  @Delete('establishments/:id')
  deleteEstablishment(
    @CurrentUser('resellerId') resellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reseller.deleteEstablishment(resellerId, id);
  }

  @Get('branding')
  getBranding(@CurrentUser('resellerId') resellerId: string) {
    return this.reseller.getBranding(resellerId);
  }

  @Patch('branding')
  updateBranding(
    @CurrentUser('resellerId') resellerId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.reseller.updateBranding(resellerId, dto);
  }

  @Get('usage')
  getUsage(@CurrentUser('resellerId') resellerId: string) {
    return this.reseller.getUsage(resellerId);
  }
}
