import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ESTABLISHMENT_ROLES,
  hasPermission,
  Permission,
} from '../auth/permissions';
import { AuthUser } from '../auth/types/auth.types';
import { AddPaymentDto } from './dto/add-payment.dto';
import { AddTabItemDto } from './dto/add-tab-item.dto';
import { CloseTabDto } from './dto/close-tab.dto';
import { CreateTabDto } from './dto/create-tab.dto';
import { UpdateTabFulfillmentDto } from './dto/update-tab-fulfillment.dto';
import { UpdateTabItemDto } from './dto/update-tab-item.dto';
import { TabsService } from './tabs.service';

// Operação de comandas: equipe de salão/caixa (não cozinha/motoboy).
// As três telas (Mesas, Balcão, Comandas) operam sobre /tabs, então qualquer
// uma delas libera o acesso base — ações sensíveis são restritas por handler.
@Roles(...ESTABLISHMENT_ROLES)
@Permissions('mesas', 'balcao', 'comandas')
@Controller('tabs')
export class TabsController {
  constructor(private readonly tabs: TabsService) {}

  @Post()
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTabDto,
  ) {
    return this.tabs.create(establishmentId, userId, dto);
  }

  @Get()
  findOpen(@CurrentUser('establishmentId') establishmentId: string) {
    return this.tabs.findOpen(establishmentId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tabs.findOne(establishmentId, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTabItemDto,
  ) {
    return this.tabs.addItem(establishmentId, id, dto);
  }

  // Serve para mudar quantidade/observação (livre) e para cancelar item
  // (restrito) — por isso a checagem depende do payload, não do handler.
  @Patch(':id/items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateTabItemDto,
  ) {
    if (dto.cancel) this.assertCan(user, 'comanda.cancelar_item');
    return this.tabs.updateItem(user.establishmentId!, id, itemId, dto);
  }

  @Patch(':id/fulfillment')
  setFulfillment(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTabFulfillmentDto,
  ) {
    return this.tabs.setFulfillment(establishmentId, id, dto);
  }

  @Post(':id/send-to-kitchen')
  sendToKitchen(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tabs.sendToKitchen(establishmentId, id);
  }

  @Post(':id/payments')
  addPayment(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.tabs.addPayment(establishmentId, id, dto);
  }

  // Fechar é livre; conceder desconto é restrito.
  @Post(':id/close')
  close(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseTabDto,
  ) {
    if (dto.discount && Number(dto.discount) > 0) {
      this.assertCan(user, 'comanda.desconto');
    }
    return this.tabs.close(user.establishmentId!, id, dto);
  }

  private assertCan(user: AuthUser, permission: Permission) {
    if (!hasPermission(user, [permission])) {
      throw new ForbiddenException(
        'Seu usuário não tem permissão para esta ação',
      );
    }
  }
}
