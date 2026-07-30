import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TabItemStatus, TabStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { halfLabel } from '../tabs/pizza-half';
import { KitchenGateway } from './kitchen.gateway';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto';

// Itens que estão "na cozinha".
const KITCHEN_STATUSES: TabItemStatus[] = [
  TabItemStatus.SENT_TO_KITCHEN,
  TabItemStatus.PREPARING,
  TabItemStatus.READY,
];

// Itens recém-entregues continuam visíveis por um tempo, permitindo desfazer
// um "Entregue" clicado por engano.
const RECENT_DELIVERED_WINDOW_MS = 15 * 60 * 1000;

const OPEN_TABS: TabStatus[] = [TabStatus.OPEN, TabStatus.AWAITING_PAYMENT];

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: KitchenGateway,
  ) {}

  // Fila da cozinha (KDS): itens ativos de comandas abertas + entregues
  // recentemente (para permitir desfazer um "Entregue" clicado por engano).
  async getQueue(establishmentId: string) {
    const recentSince = new Date(Date.now() - RECENT_DELIVERED_WINDOW_MS);
    return this.prisma.tabItem.findMany({
      where: {
        tab: { establishmentId, status: { in: OPEN_TABS } },
        OR: [
          { status: { in: KITCHEN_STATUSES } },
          {
            status: TabItemStatus.DELIVERED,
            updatedAt: { gte: recentSince },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        product: { select: { name: true } },
        halfProduct: { select: { name: true } },
        tab: {
          select: {
            id: true,
            label: true,
            table: { select: { number: true } },
            waiter: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async updateStatus(
    establishmentId: string,
    itemId: string,
    dto: UpdateKitchenStatusDto,
  ) {
    const item = await this.prisma.tabItem.findFirst({
      where: { id: itemId, tab: { establishmentId } },
      include: {
        product: { select: { name: true } },
        halfProduct: { select: { name: true } },
        tab: {
          select: {
            id: true,
            label: true,
            waiterId: true,
            table: { select: { number: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    // Aceita o item atual na cozinha ou recém-entregue (permite desfazer).
    if (
      !KITCHEN_STATUSES.includes(item.status) &&
      item.status !== TabItemStatus.DELIVERED
    ) {
      throw new ConflictException('Item não está na cozinha');
    }

    const status = dto.status as TabItemStatus;
    const updated = await this.prisma.tabItem.update({
      where: { id: itemId },
      data: { status },
    });

    this.gateway.emitStatusChanged(establishmentId, {
      itemId,
      status,
      tabId: item.tab.id,
    });

    // Ao ficar pronto, notifica o garçom responsável.
    if (status === TabItemStatus.READY && item.tab.waiterId) {
      this.gateway.emitWaiterReady(item.tab.waiterId, {
        itemId,
        productName: item.halfProduct
          ? halfLabel(item.product.name, item.halfProduct.name)
          : item.product.name,
        table: item.tab.table?.number ?? item.tab.label ?? null,
      });
    }

    return updated;
  }
}
