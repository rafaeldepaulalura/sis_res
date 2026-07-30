import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  Prisma,
  TabItemStatus,
  TabStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';
import { computeTabTotals } from '../tabs/tab-totals';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';
import {
  UpdateDeliverySettingsDto,
  UpsertZoneDto,
} from './dto/delivery-settings.dto';

const TERMINAL: DeliveryStatus[] = [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.CANCELLED,
];

const deliveryInclude = {
  order: { select: { id: true, total: true, createdAt: true } },
  customerAddress: {
    include: { customer: { select: { id: true, name: true, phone: true } } },
  },
  courier: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.DeliveryOrderInclude;

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // Pedidos fechados (com cliente) ainda sem delivery — candidatos a virar entrega.
  eligibleOrders(establishmentId: string) {
    return this.prisma.order.findMany({
      where: {
        establishmentId,
        deliveryOrder: null,
        customerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        total: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            addresses: true,
          },
        },
      },
    });
  }

  async create(establishmentId: string, dto: CreateDeliveryOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, establishmentId },
      include: { deliveryOrder: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.deliveryOrder) {
      throw new ConflictException('Pedido já possui uma entrega');
    }

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: dto.customerAddressId, customer: { establishmentId } },
    });
    if (!address) {
      throw new BadRequestException('Endereço inválido');
    }

    return this.prisma.deliveryOrder.create({
      data: {
        orderId: dto.orderId,
        customerAddressId: dto.customerAddressId,
        deliveryFee: dto.deliveryFee ?? 0,
        estimatedTime: dto.estimatedTime ?? null,
        status: DeliveryStatus.RECEIVED,
        statusTimestamps: { RECEIVED: new Date().toISOString() },
      },
      include: deliveryInclude,
    });
  }

  findAll(
    establishmentId: string,
    filters: { status?: DeliveryStatus; courierId?: string } = {},
  ) {
    const where: Prisma.DeliveryOrderWhereInput = {
      order: { establishmentId },
    };
    if (filters.status) where.status = filters.status;
    if (filters.courierId) where.courierId = filters.courierId;
    return this.prisma.deliveryOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: deliveryInclude,
    });
  }

  private async load(establishmentId: string, id: string) {
    const delivery = await this.prisma.deliveryOrder.findFirst({
      where: { id, order: { establishmentId } },
      include: deliveryInclude,
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada');
    return delivery;
  }

  findOne(establishmentId: string, id: string) {
    return this.load(establishmentId, id);
  }

  async updateStatus(
    establishmentId: string,
    id: string,
    status: DeliveryStatus,
  ) {
    const delivery = await this.load(establishmentId, id);
    return this.applyStatus(delivery.id, delivery, status);
  }

  async assignCourier(establishmentId: string, id: string, courierId: string) {
    await this.load(establishmentId, id);
    const courier = await this.prisma.courier.findFirst({
      where: { id: courierId, establishmentId, active: true },
    });
    if (!courier) throw new BadRequestException('Entregador inválido');

    return this.prisma.tenantTx(async (tx) => {
      const updated = await tx.deliveryOrder.update({
        where: { id },
        data: { courierId },
        include: deliveryInclude,
      });
      // Entregador ocupado ao ser atribuído.
      await tx.courier.update({
        where: { id: courierId },
        data: { available: false },
      });
      return updated;
    });
  }

  // Aplica a transição de status: registra timestamp e libera o motoboy no fim.
  private async applyStatus(
    id: string,
    current: {
      statusTimestamps: Prisma.JsonValue;
      courierId: string | null;
      orderId: string;
    },
    status: DeliveryStatus,
  ) {
    const timestamps = {
      ...((current.statusTimestamps as Record<string, string>) ?? {}),
      [status]: new Date().toISOString(),
    };

    return this.prisma.tenantTx(async (tx) => {
      const updated = await tx.deliveryOrder.update({
        where: { id },
        data: { status, statusTimestamps: timestamps },
        include: deliveryInclude,
      });
      if (TERMINAL.includes(status) && current.courierId) {
        await tx.courier.update({
          where: { id: current.courierId },
          data: { available: true },
        });
      }
      // Entregue: a comanda do pedido online (que ficou aberta pra passar
      // pela cozinha) agora pode ser consolidada/fechada.
      if (status === DeliveryStatus.DELIVERED) {
        const order = await tx.order.findUnique({
          where: { id: current.orderId },
          select: { tabId: true },
        });
        if (order) {
          await tx.tab.updateMany({
            where: { id: order.tabId, status: { not: TabStatus.CLOSED } },
            data: { status: TabStatus.CLOSED, closedAt: new Date() },
          });
        }
      }
      return updated;
    });
  }

  // ---- PWA do motoboy (público por courierId) ----
  // runBypass: rotas públicas sem JWT, escopo garantido pelo courierId.

  courierDeliveries(courierId: string) {
    return runBypass(async () => {
      const courier = await this.prisma.courier.findFirst({
        where: { id: courierId, active: true },
        select: {
          id: true,
          name: true,
          establishment: {
            select: { name: true, logoUrl: true, primaryColor: true },
          },
        },
      });
      if (!courier) throw new NotFoundException('Entregador não encontrado');

      const deliveries = await this.prisma.deliveryOrder.findMany({
        where: { courierId, status: { notIn: TERMINAL } },
        orderBy: { createdAt: 'asc' },
        include: deliveryInclude,
      });

      // Comandas montadas direto no PDV (balcão/mesa) e marcadas como
      // delivery+motoboy — ainda não viraram Order/DeliveryOrder (só ao
      // fechar a comanda). Aparecem aqui pra o motoboy já ver na hora.
      // order: null exclui pedidos do cardápio online (esses já têm
      // Order+DeliveryOrder desde a criação e aparecem via `deliveries`).
      const tabs = await this.prisma.tab.findMany({
        where: {
          courierId,
          isDelivery: true,
          status: { in: [TabStatus.OPEN, TabStatus.AWAITING_PAYMENT] },
          order: null,
        },
        orderBy: { openedAt: 'asc' },
        include: {
          items: {
            select: { quantity: true, unitPrice: true, status: true },
          },
          customer: { select: { id: true, name: true, phone: true } },
          deliveryAddress: true,
        },
      });
      const tabDeliveries = tabs.map((t) => ({
        id: t.id,
        label: t.label,
        total: computeTabTotals(t.items).total.toFixed(2),
        customer: t.customer,
        address: t.deliveryAddress,
        openedAt: t.openedAt,
      }));

      return { courier, deliveries, tabDeliveries };
    });
  }

  // ---- Painel interno (Delivery) ----

  // Comandas do PDV marcadas como delivery, com ou sem motoboy atribuído
  // ainda — permite ao staff ver e organizar antes de virarem Order formal.
  // order: null exclui pedidos do cardápio online (já aparecem em /delivery-orders).
  async activeTabDeliveries(establishmentId: string) {
    const tabs = await this.prisma.tab.findMany({
      where: {
        establishmentId,
        isDelivery: true,
        status: { in: [TabStatus.OPEN, TabStatus.AWAITING_PAYMENT] },
        order: null,
      },
      orderBy: { openedAt: 'asc' },
      include: {
        items: { select: { quantity: true, unitPrice: true, status: true } },
        customer: { select: { id: true, name: true, phone: true } },
        deliveryAddress: true,
        courier: { select: { id: true, name: true, phone: true } },
        table: { select: { number: true } },
      },
    });
    return tabs.map((t) => ({
      id: t.id,
      label: t.label ?? (t.table ? `Mesa ${t.table.number}` : null),
      total: computeTabTotals(t.items).total.toFixed(2),
      itemCount: t.items.filter((i) => i.status !== TabItemStatus.CANCELLED)
        .length,
      customer: t.customer,
      address: t.deliveryAddress,
      courier: t.courier,
      openedAt: t.openedAt,
    }));
  }

  // ---- Configuração de entrega (taxa e bairros) ----

  async getSettings(establishmentId: string) {
    const [settings, zones] = await Promise.all([
      this.prisma.establishment.findUnique({
        where: { id: establishmentId },
        select: {
          deliveryFee: true,
          deliveryMinOrder: true,
          deliveryFreeAbove: true,
        },
      }),
      this.prisma.deliveryZone.findMany({
        where: { establishmentId },
        orderBy: { neighborhood: 'asc' },
      }),
    ]);
    if (!settings)
      throw new NotFoundException('Estabelecimento não encontrado');
    return {
      deliveryFee: settings.deliveryFee.toFixed(2),
      deliveryMinOrder: settings.deliveryMinOrder.toFixed(2),
      deliveryFreeAbove: settings.deliveryFreeAbove?.toFixed(2) ?? null,
      zones: zones.map((z) => ({
        id: z.id,
        neighborhood: z.neighborhood,
        fee: z.fee.toFixed(2),
        active: z.active,
      })),
    };
  }

  async updateSettings(
    establishmentId: string,
    dto: UpdateDeliverySettingsDto,
  ) {
    await this.prisma.establishment.update({
      where: { id: establishmentId },
      data: {
        ...(dto.deliveryFee !== undefined
          ? { deliveryFee: dto.deliveryFee }
          : {}),
        ...(dto.deliveryMinOrder !== undefined
          ? { deliveryMinOrder: dto.deliveryMinOrder }
          : {}),
        ...(dto.deliveryFreeAbove !== undefined
          ? { deliveryFreeAbove: dto.deliveryFreeAbove }
          : {}),
      },
    });
    return this.getSettings(establishmentId);
  }

  // Cria ou atualiza o bairro pelo nome — evita duplicar "Centro".
  async upsertZone(establishmentId: string, dto: UpsertZoneDto) {
    const neighborhood = dto.neighborhood.trim();
    await this.prisma.deliveryZone.upsert({
      where: {
        establishmentId_neighborhood: { establishmentId, neighborhood },
      },
      create: {
        establishmentId,
        neighborhood,
        fee: dto.fee,
        active: dto.active ?? true,
      },
      update: {
        fee: dto.fee,
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return this.getSettings(establishmentId);
  }

  async removeZone(establishmentId: string, id: string) {
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { id, establishmentId },
    });
    if (!zone) throw new NotFoundException('Bairro não encontrado');
    await this.prisma.deliveryZone.delete({ where: { id } });
    return this.getSettings(establishmentId);
  }

  courierUpdateStatus(courierId: string, id: string, status: DeliveryStatus) {
    return runBypass(async () => {
      // Motoboy só pode marcar "saiu" ou "entregue".
      if (
        status !== DeliveryStatus.OUT_FOR_DELIVERY &&
        status !== DeliveryStatus.DELIVERED
      ) {
        throw new BadRequestException('Status não permitido para o entregador');
      }
      const delivery = await this.prisma.deliveryOrder.findFirst({
        where: { id, courierId },
      });
      if (!delivery) throw new NotFoundException('Entrega não encontrada');
      return this.applyStatus(delivery.id, delivery, status);
    });
  }
}
