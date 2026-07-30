import { Injectable } from '@nestjs/common';
import { Prisma, TabItemStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeTabTotals } from '../tabs/tab-totals';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { TabsReportQueryDto } from './dto/tabs-report-query.dto';

const TZ = 'America/Sao_Paulo';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(establishmentId: string, query: SalesReportQueryDto) {
    const to = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
    const from = query.from
      ? new Date(`${query.from}T00:00:00`)
      : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

    // Uma consulta traz pedidos + pagamentos + itens do período.
    const orders = await this.prisma.order.findMany({
      where: { establishmentId, createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        total: true,
        discount: true,
        createdAt: true,
        tab: {
          select: {
            payments: { select: { method: true, amount: true } },
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                status: true,
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const zero = () => new Prisma.Decimal(0);
    let grossTotal = zero();
    let discountTotal = zero();
    const byDay = new Map<string, { total: Prisma.Decimal; orders: number }>();
    const byMethod = new Map<
      string,
      { total: Prisma.Decimal; count: number }
    >();
    const byProduct = new Map<
      string,
      { name: string; quantity: number; total: Prisma.Decimal }
    >();

    for (const order of orders) {
      grossTotal = grossTotal.plus(order.total);
      discountTotal = discountTotal.plus(order.discount);

      const day = dayFmt.format(order.createdAt);
      const d = byDay.get(day) ?? { total: zero(), orders: 0 };
      d.total = d.total.plus(order.total);
      d.orders += 1;
      byDay.set(day, d);

      for (const p of order.tab.payments) {
        const m = byMethod.get(p.method) ?? { total: zero(), count: 0 };
        m.total = m.total.plus(p.amount);
        m.count += 1;
        byMethod.set(p.method, m);
      }

      for (const item of order.tab.items) {
        if (item.status === TabItemStatus.CANCELLED) continue;
        const key = item.product.id;
        const prev = byProduct.get(key) ?? {
          name: item.product.name,
          quantity: 0,
          total: zero(),
        };
        prev.quantity += item.quantity;
        prev.total = prev.total.plus(
          new Prisma.Decimal(item.unitPrice).times(item.quantity),
        );
        byProduct.set(key, prev);
      }
    }

    const orderCount = orders.length;
    const avgTicket = orderCount ? grossTotal.dividedBy(orderCount) : zero();

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        orders: orderCount,
        total: grossTotal.toFixed(2),
        discount: discountTotal.toFixed(2),
        averageTicket: avgTicket.toFixed(2),
      },
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          total: v.total.toFixed(2),
          orders: v.orders,
        })),
      byPaymentMethod: [...byMethod.entries()]
        .map(([method, v]) => ({
          method,
          total: v.total.toFixed(2),
          count: v.count,
        }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
      byProduct: [...byProduct.values()]
        .map((v) => ({
          name: v.name,
          quantity: v.quantity,
          total: v.total.toFixed(2),
        }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
    };
  }

  // Vendas por garçom no período (baseado no garçom da comanda).
  async waiters(establishmentId: string, query: SalesReportQueryDto) {
    const to = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
    const from = query.from
      ? new Date(`${query.from}T00:00:00`)
      : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: { establishmentId, createdAt: { gte: from, lte: to } },
      select: {
        total: true,
        tab: { select: { waiter: { select: { id: true, name: true } } } },
      },
    });

    const byWaiter = new Map<
      string,
      { name: string; total: Prisma.Decimal; orders: number }
    >();
    for (const order of orders) {
      const w = order.tab.waiter;
      const key = w?.id ?? 'sem-garcom';
      const name = w?.name ?? 'Sem garçom';
      const prev = byWaiter.get(key) ?? {
        name,
        total: new Prisma.Decimal(0),
        orders: 0,
      };
      prev.total = prev.total.plus(order.total);
      prev.orders += 1;
      byWaiter.set(key, prev);
    }

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      waiters: [...byWaiter.values()]
        .map((v) => ({
          name: v.name,
          orders: v.orders,
          total: v.total.toFixed(2),
        }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
    };
  }

  // Comandas abertas/fechadas no dia — inclui as ainda em andamento (sem
  // Order ainda), diferente dos relatórios acima que só olham vendas fechadas.
  async tabsOfDay(establishmentId: string, query: TabsReportQueryDto) {
    const date = query.date ?? dayFmt.format(new Date());
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(`${date}T23:59:59.999`);

    const tabs = await this.prisma.tab.findMany({
      where: { establishmentId, openedAt: { gte: from, lte: to } },
      orderBy: { openedAt: 'desc' },
      select: {
        id: true,
        type: true,
        label: true,
        status: true,
        isDelivery: true,
        openedAt: true,
        closedAt: true,
        table: { select: { number: true } },
        waiter: { select: { name: true } },
        courier: { select: { name: true } },
        order: { select: { total: true } },
        // Comanda juntada em outra: mostra para onde foi, senão apareceria
        // como conta fechada e vazia.
        mergedInto: {
          select: { label: true, table: { select: { number: true } } },
        },
        items: {
          select: { quantity: true, unitPrice: true, status: true },
        },
      },
    });

    return tabs.map((tab) => {
      const total = tab.order
        ? new Prisma.Decimal(tab.order.total)
        : computeTabTotals(tab.items).total;
      const itemCount = tab.items
        .filter((i) => i.status !== TabItemStatus.CANCELLED)
        .reduce((n, i) => n + i.quantity, 0);

      const destino = tab.mergedInto
        ? (tab.mergedInto.label ??
          (tab.mergedInto.table
            ? `Mesa ${tab.mergedInto.table.number}`
            : 'outra comanda'))
        : null;

      return {
        id: tab.id,
        label: tab.label ?? (tab.table ? `Mesa ${tab.table.number}` : tab.type),
        status: tab.status,
        // Quando preenchido, a conta não é uma venda: foi juntada nesta.
        mergedInto: destino,
        isDelivery: tab.isDelivery,
        waiterName: tab.waiter?.name ?? null,
        courierName: tab.courier?.name ?? null,
        itemCount,
        total: total.toFixed(2),
        openedAt: tab.openedAt.toISOString(),
        closedAt: tab.closedAt?.toISOString() ?? null,
      };
    });
  }
}
