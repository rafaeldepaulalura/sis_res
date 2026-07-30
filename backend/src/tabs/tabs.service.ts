import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  Payment,
  PaymentMethod,
  Prisma,
  Tab,
  TableStatus,
  TabItemStatus,
  TabStatus,
  TabType,
} from '@prisma/client';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { KitchenGateway } from '../kitchen/kitchen.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AddPaymentDto } from './dto/add-payment.dto';
import { PinAuthService } from '../auth/pin-auth.service';
import { PrintingService } from '../printing/printing.service';
import type { TicketItem } from '../printing/print-ticket';
import { resolveDeliveryFee } from '../delivery/delivery-fee';
import { AddTabItemDto } from './dto/add-tab-item.dto';
import { CloseTabDto } from './dto/close-tab.dto';
import { CreateTabDto } from './dto/create-tab.dto';
import { UpdateTabFulfillmentDto } from './dto/update-tab-fulfillment.dto';
import { UpdateTabItemDto } from './dto/update-tab-item.dto';
import {
  groupsOf,
  modifiersLabel,
  productModifierInclude,
  resolveModifiers,
  type ModifierSnapshot,
} from './modifiers';
import { assertHalfAllowed, halfLabel, halfPrice } from './pizza-half';
import { computeTabTotals } from './tab-totals';

// Comanda "viva" = pode receber pagamento/fechamento.
const OPEN_STATUSES: TabStatus[] = [TabStatus.OPEN, TabStatus.AWAITING_PAYMENT];

const tabInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: { select: { id: true, name: true } },
      halfProduct: { select: { id: true, name: true } },
    },
  },
  table: { select: { id: true, number: true } },
  waiter: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true } },
  courier: { select: { id: true, name: true, phone: true } },
  deliveryAddress: true,
  payments: true,
  order: true,
} satisfies Prisma.TabInclude;

@Injectable()
export class TabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashRegister: CashRegisterService,
    private readonly kitchen: KitchenGateway,
    private readonly pinAuth: PinAuthService,
    private readonly printing: PrintingService,
  ) {}

  async create(establishmentId: string, userId: string, dto: CreateTabDto) {
    let tableId: string | null = null;

    if (dto.type === TabType.TABLE) {
      if (!dto.tableId) {
        throw new BadRequestException(
          'tableId é obrigatório para comanda de mesa',
        );
      }
      const table = await this.prisma.table.findFirst({
        where: { id: dto.tableId, establishmentId },
      });
      if (!table) throw new NotFoundException('Mesa não encontrada');
      if (table.status !== TableStatus.FREE) {
        throw new ConflictException('Mesa não está livre');
      }
      tableId = table.id;
    }

    // Valida vínculos opcionais dentro do mesmo estabelecimento.
    // noWaiter permite abrir sem atendente, sem cair no fallback do usuário atual.
    const waiterId = dto.noWaiter ? null : (dto.waiterId ?? userId);
    if (dto.waiterId) await this.assertUser(establishmentId, dto.waiterId);
    if (dto.customerId)
      await this.assertCustomer(establishmentId, dto.customerId);

    const created = await this.prisma.tenantTx(async (tx) => {
      const tab = await tx.tab.create({
        data: {
          establishmentId,
          type: dto.type,
          tableId,
          label: dto.label ?? null,
          customerId: dto.customerId ?? null,
          waiterId,
          status: TabStatus.OPEN,
        },
      });
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: TableStatus.OCCUPIED },
        });
      }
      return tab;
    });

    return this.findOne(establishmentId, created.id);
  }

  // Lista as comandas "vivas" (abertas / aguardando pagamento) do estabelecimento.
  async findOpen(establishmentId: string) {
    const tabs = await this.prisma.tab.findMany({
      where: { establishmentId, status: { in: OPEN_STATUSES } },
      orderBy: { openedAt: 'asc' },
      include: {
        table: { select: { number: true } },
        waiter: { select: { name: true } },
        items: { select: { quantity: true, unitPrice: true, status: true } },
      },
    });
    return tabs.map((tab) => {
      const { subtotal, total } = computeTabTotals(tab.items, 0);
      return {
        id: tab.id,
        type: tab.type,
        status: tab.status,
        label: tab.label,
        table: tab.table,
        waiter: tab.waiter,
        openedAt: tab.openedAt,
        itemCount: tab.items.filter((i) => i.status !== TabItemStatus.CANCELLED)
          .length,
        totals: { subtotal: subtotal.toFixed(2), total: total.toFixed(2) },
      };
    });
  }

  async findOne(establishmentId: string, id: string) {
    const tab = await this.prisma.tab.findFirst({
      where: { id, establishmentId },
      include: tabInclude,
    });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    return {
      ...tab,
      totals: this.totalsOf(tab.items, tab.payments, tab.deliveryFee),
    };
  }

  async addItem(establishmentId: string, tabId: string, dto: AddTabItemDto) {
    await this.getOpenTab(establishmentId, tabId);
    const withCategory = { category: { select: { allowsHalf: true } } };
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, establishmentId, active: true },
      include: { ...withCategory, ...productModifierInclude },
    });
    if (!product) {
      throw new BadRequestException('Produto inválido ou inativo');
    }

    // Pizza meia a meia: valida o 2º sabor e cobra pelo mais caro.
    let halfProductId: string | null = null;
    let unitPrice = product.price;
    if (dto.halfProductId) {
      const half = await this.prisma.product.findFirst({
        where: { id: dto.halfProductId, establishmentId, active: true },
        include: withCategory,
      });
      assertHalfAllowed(product, half);
      halfProductId = half.id;
      unitPrice = halfPrice(product, half);
    }

    // Complementos: confere as regras do grupo e soma os adicionais.
    const { snapshot, extra } = resolveModifiers(
      groupsOf(product),
      dto.modifierOptionIds,
    );
    unitPrice = unitPrice.plus(extra);

    await this.prisma.tabItem.create({
      data: {
        tabId,
        productId: product.id,
        halfProductId,
        quantity: dto.quantity ?? 1,
        unitPrice,
        notes: dto.notes ?? null,
        modifiers: snapshot as unknown as Prisma.InputJsonValue,
        status: TabItemStatus.PENDING,
      },
    });
    return this.findOne(establishmentId, tabId);
  }

  async updateItem(
    establishmentId: string,
    tabId: string,
    itemId: string,
    dto: UpdateTabItemDto,
  ) {
    await this.getOpenTab(establishmentId, tabId);
    const item = await this.prisma.tabItem.findFirst({
      where: { id: itemId, tabId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (item.status === TabItemStatus.CANCELLED) {
      throw new ConflictException('Item já cancelado');
    }

    const data: Prisma.TabItemUpdateInput = {};
    if (dto.cancel) {
      data.status = TabItemStatus.CANCELLED;
      data.cancelledAt = new Date();

      // Trava de gerente: quando ligada, exige o PIN de alguém autorizado e
      // guarda quem liberou.
      const { requirePinForCancelItem } =
        await this.pinAuth.settings(establishmentId);
      if (requirePinForCancelItem) {
        const quem = await this.pinAuth.authorize(
          establishmentId,
          dto.authPin,
          'comanda.cancelar_item',
        );
        data.cancelledBy = { connect: { id: quem.id } };
      }
    } else {
      if (dto.quantity !== undefined) data.quantity = dto.quantity;
      if (dto.notes !== undefined) data.notes = dto.notes;
    }
    await this.prisma.tabItem.update({ where: { id: itemId }, data });
    return this.findOne(establishmentId, tabId);
  }

  // Marca a comanda como delivery/local; se delivery, vincula motoboy, cliente
  // e endereço de entrega (necessário para o motoboy saber pra onde ir).
  async setFulfillment(
    establishmentId: string,
    tabId: string,
    dto: UpdateTabFulfillmentDto,
  ) {
    const tab = await this.getOpenTab(establishmentId, tabId);

    let courierId: string | null = null;
    let customerId: string | null = null;
    let deliveryAddressId: string | null = null;

    if (dto.isDelivery) {
      if (dto.courierId) {
        const courier = await this.prisma.courier.findFirst({
          where: { id: dto.courierId, establishmentId },
        });
        if (!courier) throw new BadRequestException('Motoboy inválido');
        courierId = courier.id;
      }

      // Cliente/endereço: se não vier no payload, mantém o que a comanda já
      // tinha (permite trocar só o motoboy sem reenviar tudo de novo).
      customerId = dto.customerId ?? tab.customerId;
      if (dto.customerId)
        await this.assertCustomer(establishmentId, dto.customerId);

      if (dto.deliveryAddressId) {
        if (!customerId) {
          throw new BadRequestException(
            'Selecione o cliente antes do endereço de entrega',
          );
        }
        const address = await this.prisma.customerAddress.findFirst({
          where: { id: dto.deliveryAddressId, customerId },
        });
        if (!address) throw new BadRequestException('Endereço inválido');
        deliveryAddressId = address.id;
      } else {
        deliveryAddressId = tab.deliveryAddressId;
      }
    }

    // Taxa: recalculada a partir do bairro do endereço. Volta a zero quando
    // a comanda deixa de ser entrega.
    const deliveryFee = dto.isDelivery
      ? await this.deliveryFeeFor(establishmentId, tabId, deliveryAddressId)
      : new Prisma.Decimal(0);

    await this.prisma.tab.update({
      where: { id: tabId },
      data: {
        isDelivery: dto.isDelivery,
        courierId,
        customerId,
        deliveryAddressId,
        deliveryFee,
      },
    });
    return this.findOne(establishmentId, tabId);
  }

  // Calcula a taxa do bairro do endereço vinculado à comanda.
  private async deliveryFeeFor(
    establishmentId: string,
    tabId: string,
    deliveryAddressId: string | null,
  ): Promise<Prisma.Decimal> {
    const [settings, zones, items, address] = await Promise.all([
      this.prisma.establishment.findUnique({
        where: { id: establishmentId },
        select: {
          deliveryFee: true,
          deliveryMinOrder: true,
          deliveryFreeAbove: true,
        },
      }),
      this.prisma.deliveryZone.findMany({ where: { establishmentId } }),
      this.prisma.tabItem.findMany({
        where: { tabId },
        select: { unitPrice: true, quantity: true, status: true },
      }),
      deliveryAddressId
        ? this.prisma.customerAddress.findUnique({
            where: { id: deliveryAddressId },
            select: { neighborhood: true },
          })
        : null,
    ]);
    if (!settings) return new Prisma.Decimal(0);

    const { subtotal } = computeTabTotals(items);
    // No PDV o atendente decide se aceita pedido pequeno, então aqui não
    // aplicamos o mínimo — ele vale para o pedido feito pelo cliente.
    return resolveDeliveryFee(
      settings,
      zones,
      address?.neighborhood ?? null,
      subtotal,
    ).fee;
  }

  // Envia itens PENDING para a cozinha e emite kitchen:new_item via WebSocket.
  async sendToKitchen(establishmentId: string, tabId: string) {
    const tab = await this.getOpenTab(establishmentId, tabId);
    const pending = await this.prisma.tabItem.findMany({
      where: { tabId, status: TabItemStatus.PENDING },
      include: {
        // A categoria do produto decide para qual impressora o item vai.
        product: {
          select: {
            id: true,
            name: true,
            category: { select: { printerId: true } },
          },
        },
        halfProduct: { select: { id: true, name: true } },
      },
    });
    if (pending.length === 0) {
      throw new BadRequestException('Nenhum item pendente para enviar');
    }
    await this.prisma.tabItem.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { status: TabItemStatus.SENT_TO_KITCHEN },
    });

    const items = pending.map((p) => {
      // Complementos entram junto da observação: é o que a cozinha precisa
      // ler para montar o prato certo ("sem cebola, bacon extra").
      const extras = modifiersLabel(
        (p.modifiers ?? []) as unknown as ModifierSnapshot[],
      );
      return {
        id: p.id,
        // Meia a meia sai na cozinha já com os dois sabores no nome.
        productName: p.halfProduct
          ? halfLabel(p.product.name, p.halfProduct.name)
          : p.product.name,
        quantity: p.quantity,
        notes: [extras, p.notes].filter(Boolean).join(' · ') || null,
      };
    });

    this.kitchen.emitNewItems(establishmentId, {
      tabId,
      tableId: tab.tableId,
      items,
    });

    // Separa os itens por impressora: bebida vai para a copa, lanche para a
    // chapa. Categoria sem impressora não imprime — trabalha só pela tela.
    const porImpressora = new Map<string, TicketItem[]>();
    for (const p of pending) {
      const printerId = p.product.category?.printerId;
      if (!printerId) continue;
      const extras = modifiersLabel(
        (p.modifiers ?? []) as unknown as ModifierSnapshot[],
      );
      const lista = porImpressora.get(printerId) ?? [];
      lista.push({
        quantity: p.quantity,
        name: p.halfProduct
          ? halfLabel(p.product.name, p.halfProduct.name)
          : p.product.name,
        extras: extras || null,
        notes: p.notes,
      });
      porImpressora.set(printerId, lista);
    }

    const vias = await this.printing.enqueueKitchen({
      establishmentId,
      origem: await this.origemDaComanda(tabId),
      waiter: tab.waiterId ? await this.nomeDoGarcom(tab.waiterId) : null,
      porImpressora,
    });

    return { sent: pending.length, items, vias };
  }

  // Como a comanda aparece no topo da via impressa.
  private async origemDaComanda(tabId: string): Promise<string> {
    const tab = await this.prisma.tab.findUnique({
      where: { id: tabId },
      select: { label: true, table: { select: { number: true } } },
    });
    if (tab?.table) return `MESA ${tab.table.number}`;
    return tab?.label ?? 'BALCÃO';
  }

  private async nomeDoGarcom(waiterId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: waiterId },
      select: { name: true },
    });
    return u?.name ?? null;
  }

  // Registra um pagamento avulso (split). Venda em dinheiro entra na gaveta.
  async addPayment(establishmentId: string, tabId: string, dto: AddPaymentDto) {
    const tab = await this.prisma.tab.findFirst({
      where: { id: tabId, establishmentId },
    });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    if (!OPEN_STATUSES.includes(tab.status)) {
      throw new ConflictException('Comanda não está aberta para pagamento');
    }

    await this.prisma.payment.create({
      data: { tabId, method: dto.method, amount: dto.amount },
    });
    if (dto.method === PaymentMethod.CASH) {
      await this.cashRegister.registerCashSale(
        establishmentId,
        dto.amount,
        `Venda comanda ${tabId}`,
      );
    }
    return this.findOne(establishmentId, tabId);
  }

  async close(establishmentId: string, tabId: string, dto: CloseTabDto) {
    const tab = await this.prisma.tab.findFirst({
      where: { id: tabId, establishmentId },
      include: { items: true, order: true, payments: true },
    });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    if (!OPEN_STATUSES.includes(tab.status)) {
      throw new ConflictException('Comanda já fechada ou cancelada');
    }
    if (tab.order) {
      throw new ConflictException('Comanda já possui pedido consolidado');
    }

    const { subtotal, discount, total } = computeTabTotals(
      tab.items,
      dto.discount ?? 0,
      tab.deliveryFee,
    );
    if (total.lessThan(0)) {
      throw new BadRequestException('Desconto maior que o total da comanda');
    }

    // Trava de gerente no desconto: só pede PIN se houver desconto de fato.
    let discountById: string | null = null;
    if (discount.greaterThan(0)) {
      const { requirePinForDiscount } =
        await this.pinAuth.settings(establishmentId);
      if (requirePinForDiscount) {
        const quem = await this.pinAuth.authorize(
          establishmentId,
          dto.authPin,
          'comanda.desconto',
        );
        discountById = quem.id;
      }
    }

    // Cobertura = pagamentos já registrados + pagamentos informados agora.
    const inline = dto.payments ?? [];
    const alreadyPaid = tab.payments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const inlinePaid = inline.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const paidTotal = alreadyPaid.plus(inlinePaid);

    if (paidTotal.lessThan(total)) {
      const missing = total.minus(paidTotal).toFixed(2);
      throw new BadRequestException(
        `Pagamento insuficiente: faltam R$ ${missing}`,
      );
    }
    const change = paidTotal.minus(total); // troco

    const order = await this.prisma.tenantTx(async (tx) => {
      for (const p of inline) {
        await tx.payment.create({
          data: { tabId, method: p.method, amount: p.amount },
        });
        if (p.method === PaymentMethod.CASH) {
          await this.cashRegister.registerCashSale(
            establishmentId,
            p.amount,
            `Venda comanda ${tabId}`,
            tx,
          );
        }
      }
      const createdOrder = await tx.order.create({
        data: {
          establishmentId,
          tabId,
          customerId: tab.customerId,
          total,
          discount,
          discountById,
        },
      });

      // Delivery montado direto no PDV (sem passar pelo cardápio online):
      // consolida o DeliveryOrder só agora, no fechamento — até aqui o
      // motoboy já via a comanda pelo vínculo direto isDelivery/courierId.
      if (tab.isDelivery && tab.deliveryAddressId) {
        const now = new Date().toISOString();
        await tx.deliveryOrder.create({
          data: {
            orderId: createdOrder.id,
            customerAddressId: tab.deliveryAddressId,
            courierId: tab.courierId,
            status: DeliveryStatus.DELIVERED,
            statusTimestamps: {
              RECEIVED: now,
              OUT_FOR_DELIVERY: now,
              DELIVERED: now,
            },
          },
        });
      }

      await tx.tab.update({
        where: { id: tabId },
        data: { status: TabStatus.CLOSED, closedAt: new Date() },
      });
      if (tab.tableId) {
        await tx.table.update({
          where: { id: tab.tableId },
          data: { status: TableStatus.FREE },
        });
      }
      return createdOrder;
    });

    return {
      order,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2),
      paid: paidTotal.toFixed(2),
      change: change.toFixed(2),
    };
  }

  // ---- helpers ----

  private totalsOf(
    items: {
      unitPrice: Prisma.Decimal;
      quantity: number;
      status: TabItemStatus;
    }[],
    payments: Payment[] = [],
    deliveryFee: Prisma.Decimal | number = 0,
  ) {
    const { subtotal, total } = computeTabTotals(items, 0, deliveryFee);
    const paid = payments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const remaining = total.minus(paid);
    return {
      subtotal: subtotal.toFixed(2),
      deliveryFee: new Prisma.Decimal(deliveryFee).toFixed(2),
      total: total.toFixed(2),
      paid: paid.toFixed(2),
      remaining: remaining.toFixed(2),
    };
  }

  private async getOpenTab(
    establishmentId: string,
    tabId: string,
  ): Promise<Tab> {
    const tab = await this.prisma.tab.findFirst({
      where: { id: tabId, establishmentId },
    });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    if (tab.status !== TabStatus.OPEN) {
      throw new ConflictException('Comanda não está aberta para edição');
    }
    return tab;
  }

  private async assertUser(establishmentId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, establishmentId },
    });
    if (!user) throw new BadRequestException('Garçom inválido');
  }

  private async assertCustomer(establishmentId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, establishmentId },
    });
    if (!customer) throw new BadRequestException('Cliente inválido');
  }
}
