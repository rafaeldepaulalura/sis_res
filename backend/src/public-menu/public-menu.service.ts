import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  Prisma,
  TabItemStatus,
  TabStatus,
  TabType,
} from '@prisma/client';
import { KitchenGateway } from '../kitchen/kitchen.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';
import {
  groupsOf,
  modifiersLabel,
  productModifierInclude,
  resolveModifiers,
  type ModifierSnapshot,
} from '../tabs/modifiers';
import { assertMinOrder, resolveDeliveryFee } from '../delivery/delivery-fee';
import { assertHalfAllowed, halfLabel, halfPrice } from '../tabs/pizza-half';
import { computeTabTotals } from '../tabs/tab-totals';
import { PublicOrderDto } from './dto/public-order.dto';

@Injectable()
export class PublicMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchen: KitchenGateway,
  ) {}

  private async findEstablishment(slug: string) {
    const est = await this.prisma.establishment.findFirst({
      where: { slug, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
      },
    });
    if (!est) throw new NotFoundException('Estabelecimento não encontrado');
    return est;
  }

  // Cardápio público: só categorias com produtos ativos.
  // runBypass: rota pública resolve o estabelecimento pelo slug (sem JWT).
  getMenu(slug: string) {
    return runBypass(() => this.getMenuInner(slug));
  }

  private async getMenuInner(slug: string) {
    const establishment = await this.findEstablishment(slug);
    const categories = await this.prisma.category.findMany({
      where: { establishmentId: establishment.id },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        order: true,
        allowsHalf: true,
        products: {
          where: { active: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            // Complementos que o cliente escolhe na hora de pedir.
            modifierGroups: {
              orderBy: { order: 'asc' },
              select: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    required: true,
                    minSelect: true,
                    maxSelect: true,
                    active: true,
                    options: {
                      where: { active: true },
                      orderBy: [{ order: 'asc' }, { name: 'asc' }],
                      select: { id: true, name: true, priceDelta: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return {
      establishment,
      // Achata o vínculo produto→grupo: o cardápio recebe os grupos direto,
      // já sem os desativados.
      categories: categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({
          ...c,
          products: c.products.map((p) => ({
            ...p,
            modifierGroups: p.modifierGroups
              .map((link) => link.group)
              .filter((g) => g.active)
              .map((g) => ({ ...g, active: undefined })),
          })),
        })),
    };
  }

  // Cliente que já pediu antes: devolve nome e último endereço para o
  // checkout vir preenchido. Só existe registro depois do 1º pedido.
  // Escopo por estabelecimento — cliente de um restaurante não vaza no outro.
  // runBypass: rota pública (sem JWT), escopo garantido pelo slug.
  findCustomerByPhone(slug: string, phone: string) {
    return runBypass(async () => {
      const establishment = await this.findEstablishment(slug);
      const digits = phone.replace(/\D/g, '');
      // Telefone curto demais não identifica ninguém — evita varredura ampla.
      if (digits.length < 10) return null;

      const customer = await this.prisma.customer.findFirst({
        where: { establishmentId: establishment.id, phone: digits },
        select: {
          name: true,
          phone: true,
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
            take: 1,
            select: {
              street: true,
              number: true,
              complement: true,
              neighborhood: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
        },
      });
      if (!customer) return null;
      return {
        name: customer.name,
        phone: customer.phone,
        address: customer.addresses[0] ?? null,
      };
    });
  }

  // Configuração de entrega + taxa do bairro, para o cardápio mostrar o
  // valor antes do cliente confirmar (e avisar do pedido mínimo).
  // runBypass: rota pública (sem JWT), escopo garantido pelo slug.
  quoteDelivery(
    slug: string,
    neighborhood: string | undefined,
    subtotal: number,
  ) {
    return runBypass(async () => {
      const establishment = await this.findEstablishment(slug);
      const [settings, zones] = await Promise.all([
        this.prisma.establishment.findUnique({
          where: { id: establishment.id },
          select: {
            deliveryFee: true,
            deliveryMinOrder: true,
            deliveryFreeAbove: true,
          },
        }),
        this.prisma.deliveryZone.findMany({
          where: { establishmentId: establishment.id },
        }),
      ]);
      if (!settings)
        throw new NotFoundException('Estabelecimento não encontrado');

      const valor = new Prisma.Decimal(subtotal || 0);
      const minOrder = settings.deliveryMinOrder;
      let fee: string | null = null;
      let motivo: string | null = null;
      let atende = true;

      try {
        const r = resolveDeliveryFee(settings, zones, neighborhood, valor);
        fee = r.fee.toFixed(2);
        motivo = r.reason;
      } catch {
        // Bairro desativado: o cardápio mostra que não entregamos ali.
        atende = false;
      }

      return {
        atende,
        fee,
        motivo,
        minOrder: minOrder.toFixed(2),
        abaixoDoMinimo: minOrder.greaterThan(0) && valor.lessThan(minOrder),
        freeAbove: settings.deliveryFreeAbove?.toFixed(2) ?? null,
      };
    });
  }

  // runBypass: rota pública (sem JWT). O escopo é garantido no código pelo slug.
  createOrder(slug: string, dto: PublicOrderDto) {
    return runBypass(() => this.createOrderInner(slug, dto));
  }

  // Subtotal + taxa do bairro + total, barrando pedido abaixo do mínimo.
  private async deliveryTotals(
    establishmentId: string,
    itemsData: Prisma.TabItemCreateManyTabInput[],
    neighborhood: string,
  ) {
    const [settings, zones] = await Promise.all([
      this.prisma.establishment.findUnique({
        where: { id: establishmentId },
        select: {
          deliveryFee: true,
          deliveryMinOrder: true,
          deliveryFreeAbove: true,
        },
      }),
      this.prisma.deliveryZone.findMany({ where: { establishmentId } }),
    ]);
    if (!settings)
      throw new NotFoundException('Estabelecimento não encontrado');

    const { subtotal } = computeTabTotals(
      itemsData.map((i) => ({
        unitPrice: i.unitPrice as Prisma.Decimal,
        quantity: i.quantity ?? 1,
        status: TabItemStatus.SENT_TO_KITCHEN,
      })),
    );

    assertMinOrder(settings, subtotal);
    const { fee } = resolveDeliveryFee(settings, zones, neighborhood, subtotal);
    return { subtotal, deliveryFee: fee, total: subtotal.plus(fee) };
  }

  private async createOrderInner(slug: string, dto: PublicOrderDto) {
    const establishment = await this.findEstablishment(slug);

    // Valida produtos (1º e 2º sabor) e monta os itens.
    const ids = dto.items.flatMap((i) =>
      i.halfProductId ? [i.productId, i.halfProductId] : [i.productId],
    );
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        establishmentId: establishment.id,
        active: true,
      },
      include: {
        category: { select: { allowsHalf: true } },
        ...productModifierInclude,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      if (!byId.has(item.productId)) {
        throw new BadRequestException(
          `Produto indisponível: ${item.productId}`,
        );
      }
    }
    const itemsData = dto.items.map((item) => {
      const product = byId.get(item.productId)!;

      // Preço base: inteira ou meia a meia (cobra pelo sabor mais caro).
      let unitPrice = product.price;
      let halfProductId: string | undefined;
      if (item.halfProductId) {
        const half = byId.get(item.halfProductId);
        assertHalfAllowed(product, half);
        halfProductId = half.id;
        unitPrice = halfPrice(product, half);
      }

      // Complementos: mesma validação e mesmo cálculo do PDV.
      const { snapshot, extra } = resolveModifiers(
        groupsOf(product),
        item.modifierOptionIds,
      );

      return {
        productId: product.id,
        ...(halfProductId ? { halfProductId } : {}),
        quantity: item.quantity ?? 1,
        unitPrice: unitPrice.plus(extra),
        notes: item.notes ?? null,
        modifiers: snapshot as unknown as Prisma.InputJsonValue,
        status: TabItemStatus.SENT_TO_KITCHEN,
      };
    });

    // Canal: mesa (QR) → DELIVERY → retirada (default).
    if (dto.tableNumber) {
      return this.createDineIn(establishment.id, dto, itemsData);
    }
    if (dto.fulfillment === 'DELIVERY') {
      return this.createDelivery(establishment.id, dto, itemsData);
    }
    return this.createPickup(establishment.id, dto, itemsData);
  }

  // ---- Consumo na mesa (QR Code na mesa) ----
  private async createDineIn(
    establishmentId: string,
    dto: PublicOrderDto,
    itemsData: Prisma.TabItemCreateManyTabInput[],
  ) {
    const label = `Mesa ${dto.tableNumber} (QR)`;
    const tab = await this.prisma.tab.create({
      data: {
        establishmentId,
        type: TabType.INDIVIDUAL,
        label,
        status: TabStatus.OPEN,
        items: { create: itemsData },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            halfProduct: { select: { name: true } },
          },
        },
      },
    });
    this.emitKitchen(establishmentId, tab, 'mesa');
    return this.result(tab, label, 'Pedido enviado para a cozinha!');
  }

  // ---- Retirada no balcão ----
  private async createPickup(
    establishmentId: string,
    dto: PublicOrderDto,
    itemsData: Prisma.TabItemCreateManyTabInput[],
  ) {
    if (!dto.customerName?.trim()) {
      throw new BadRequestException('Informe seu nome para a retirada');
    }
    const label = `${dto.customerName.trim()} (retirada)`;
    const tab = await this.prisma.tab.create({
      data: {
        establishmentId,
        type: TabType.COUNTER,
        label,
        status: TabStatus.OPEN,
        items: { create: itemsData },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            halfProduct: { select: { name: true } },
          },
        },
      },
    });
    this.emitKitchen(establishmentId, tab, 'retirada');
    return this.result(
      tab,
      label,
      'Pedido recebido! Retire no balcão quando estiver pronto.',
    );
  }

  // ---- Entrega (delivery) ----
  private async createDelivery(
    establishmentId: string,
    dto: PublicOrderDto,
    itemsData: Prisma.TabItemCreateManyTabInput[],
  ) {
    if (!dto.customerName?.trim() || !dto.customerPhone?.trim()) {
      throw new BadRequestException('Nome e telefone são obrigatórios');
    }
    if (!dto.address) {
      throw new BadRequestException('Endereço de entrega é obrigatório');
    }
    if (!dto.paymentMethod) {
      throw new BadRequestException('Escolha a forma de pagamento');
    }

    // Cliente: reaproveita por telefone ou cria. Guarda só dígitos para que
    // "(11) 99999-8888" e "11999998888" sejam o mesmo cliente — é isso que
    // faz o preenchimento automático por telefone funcionar na 2ª compra.
    const phone = dto.customerPhone.replace(/\D/g, '');
    let customer = await this.prisma.customer.findFirst({
      where: { establishmentId, phone },
    });
    customer ??= await this.prisma.customer.create({
      data: { establishmentId, name: dto.customerName.trim(), phone },
    });

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: 'Entrega',
        street: dto.address.street,
        number: dto.address.number,
        complement: dto.address.complement ?? null,
        neighborhood: dto.address.neighborhood,
        city: dto.address.city,
        state: dto.address.state,
        zipCode: dto.address.zipCode,
      },
    });

    // Taxa de entrega pelo bairro informado + checagem do pedido mínimo.
    const { deliveryFee, total } = await this.deliveryTotals(
      establishmentId,
      itemsData,
      dto.address.neighborhood,
    );

    // Cria comanda + pedido + pagamento + entrega numa transação.
    // Não passa pelo caixa físico (dinheiro na entrega não entra na gaveta).
    // A comanda fica ABERTA (não fecha na hora): precisa passar pela cozinha
    // e só é consolidada/fechada quando o motoboy marca como entregue.
    const { tab, deliveryId } = await this.prisma.tenantTx(async (tx) => {
      const createdTab = await tx.tab.create({
        data: {
          establishmentId,
          type: TabType.DELIVERY,
          label: `${customer!.name} (delivery)`,
          customerId: customer!.id,
          isDelivery: true,
          deliveryAddressId: address.id,
          deliveryFee,
          items: { create: itemsData },
        },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              halfProduct: { select: { name: true } },
            },
          },
        },
      });
      await tx.payment.create({
        data: {
          tabId: createdTab.id,
          method: dto.paymentMethod!,
          amount: total,
        },
      });
      const order = await tx.order.create({
        data: {
          establishmentId,
          tabId: createdTab.id,
          customerId: customer!.id,
          total,
          discount: 0,
        },
      });
      const delivery = await tx.deliveryOrder.create({
        data: {
          orderId: order.id,
          customerAddressId: address.id,
          deliveryFee,
          status: DeliveryStatus.RECEIVED,
          statusTimestamps: { RECEIVED: new Date().toISOString() },
        },
      });
      return { tab: createdTab, deliveryId: delivery.id };
    });

    this.emitKitchen(establishmentId, tab, 'entrega');
    return {
      ...this.result(
        tab,
        tab.label!,
        'Pedido de entrega recebido!',
        deliveryFee,
      ),
      deliveryId,
      paymentMethod: dto.paymentMethod,
    };
  }

  // ---- helpers ----

  // Todo pedido que passa por aqui veio do cardápio online: avisa a cozinha
  // e também o salão, com o canal, para ninguém deixar pedido esperando.
  private emitKitchen(
    establishmentId: string,
    tab: {
      id: string;
      label?: string | null;
      items: {
        id: string;
        quantity: number;
        notes: string | null;
        modifiers?: unknown;
        product: { name: string };
        halfProduct?: { name: string } | null;
      }[];
    },
    canal: 'mesa' | 'retirada' | 'entrega' = 'retirada',
  ) {
    this.kitchen.emitNewOnlineOrder(establishmentId, {
      tabId: tab.id,
      label: tab.label ?? null,
      canal,
      itemCount: tab.items.length,
    });

    this.kitchen.emitNewItems(establishmentId, {
      tabId: tab.id,
      tableId: null,
      items: tab.items.map((i) => ({
        id: i.id,
        // Meia a meia sai na cozinha já com os dois sabores no nome.
        productName: i.halfProduct
          ? halfLabel(i.product.name, i.halfProduct.name)
          : i.product.name,
        quantity: i.quantity,
        // Complementos junto da observação, como no PDV.
        notes:
          [
            modifiersLabel(
              (i.modifiers ?? []) as unknown as ModifierSnapshot[],
            ),
            i.notes,
          ]
            .filter(Boolean)
            .join(' · ') || null,
      })),
    });
  }

  private result(
    tab: { id: string; items: unknown[] },
    label: string,
    message: string,
    // Entrega: precisa entrar aqui também, senão a tela de confirmação
    // mostraria um valor menor do que o cliente vai pagar.
    deliveryFee: Prisma.Decimal | number = 0,
  ) {
    const { subtotal, total } = computeTabTotals(
      tab.items as {
        unitPrice: Prisma.Decimal;
        quantity: number;
        status: TabItemStatus;
      }[],
      0,
      deliveryFee,
    );
    return {
      tabId: tab.id,
      label,
      itemCount: tab.items.length,
      subtotal: subtotal.toFixed(2),
      deliveryFee: new Prisma.Decimal(deliveryFee).toFixed(2),
      total: total.toFixed(2),
      message,
    };
  }
}
