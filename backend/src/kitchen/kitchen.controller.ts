import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto';
import { KitchenService } from './kitchen.service';

// Quem entra é decidido pela permissão "cozinha" que o dono concede — o
// @Roles aqui só barra papéis de fora do estabelecimento.
@Roles(...ESTABLISHMENT_ROLES)
@Permissions('cozinha')
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Get('queue')
  queue(@CurrentUser('establishmentId') establishmentId: string) {
    return this.kitchen.getQueue(establishmentId);
  }

  @Patch('items/:id/status')
  updateStatus(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKitchenStatusDto,
  ) {
    return this.kitchen.updateStatus(establishmentId, id, dto);
  }
}
