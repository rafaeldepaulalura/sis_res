import { Injectable } from '@nestjs/common';
import {
  DeliveryStatus,
  Prisma,
  TabItemStatus,
  TableStatus,
  TabStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TZ = 'America/Sao_Paulo';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const hourFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  hour12: false,
});
const weekdayFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'short',
});

// Itens que a cozinha ainda está devendo.
const IN_KITCHEN: TabItemStatus[] = [
  TabItemStatus.SENT_TO_KITCHEN,
  TabItemStatus.PREPARING,
];

// Minutos a partir dos quais um item na cozinha vira alerta na tela.
const LATE_MINUTES = 30;

// Diferença entre o relógio do servidor (UTC no container) e o fuso do
// restaurante. Calculado por instante para não quebrar se voltar horário
// de verão.
function tzOffsetMs(instant: Date): number {
  const asUtc = new Date(instant.toLocaleString('en-US', { timeZone: 'UTC' }));
  const asLocal = new Date(instant.toLocaleString('en-US', { timeZone: TZ }));
  return asUtc.getTime() - asLocal.getTime();
}

// Instante em que começa o dia (00:00 no fuso do restaurante).
function startOfDay(dayIso: string): Date {
  const naive = new Date(`${dayIso}T00:00:00Z`);
  return new Date(naive.getTime() + tzOffsetMs(naive));
}

function isoDayShift(days: number): string {
  return dayFmt.format(new Date(Date.now() - days * 86_400_000));
}

// Variação percentual entre dois períodos. Sem base de comparação (período
// anterior zerado) devolve null — melhor não mostrar nada do que "+100%".
function change(current: Prisma.Decimal, previous: Prisma.Decimal) {
  if (previous.isZero()) return null;
  return Number(
    current.minus(previous).dividedBy(previous).times(100).toFixed(1),
  );
}

function changeInt(current: number, previous: number) {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Painel inicial. `withMoney` vem da permissão de relatórios: sem ela o
  // funcionário vê a operação (mesas, cozinha, entregas) mas não o quanto o
  // restaurante fatura.
  async overview(establishmentId: string, withMoney: boolean) {
    const today = dayFmt.format(new Date());
    // 14 dias: 7 para os gráficos + 7 para comparar com a semana anterior.
    const startWindow = startOfDay(isoDayShift(13));

    const [orders, tables, kitchenItems, tabDeliveries, deliveryOrders] =
      await Promise.all([
        this.prisma.order.findMany({
          where: { establishmentId, createdAt: { gte: startWindow } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            createdAt: true,
            tab: {
              select: {
                id: true,
                label: true,
                type: true,
                isDelivery: true,
                payments: { select: { method: true, amount: true } },
                table: { select: { number: true } },
                customer: { select: { name: true } },
              },
            },
          },
        }),
        this.prisma.table.groupBy({
          by: ['status'],
          where: { establishmentId },
          _count: { _all: true },
        }),
        this.prisma.tabItem.findMany({
          where: {
            tab: { establishmentId },
            status: { in: IN_KITCHEN },
          },
          select: {
            tabId: true,
            createdAt: true,
            tab: {
              select: {
                label: true,
                table: { select: { number: true } },
              },
            },
          },
        }),
        this.prisma.tab.count({
          where: {
            establishmentId,
            isDelivery: true,
            status: { in: [TabStatus.OPEN, TabStatus.AWAITING_PAYMENT] },
            order: null,
          },
        }),
        this.prisma.deliveryOrder.count({
          where: {
            order: { establishmentId },
            status: {
              notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
            },
          },
        }),
      ]);

    const zero = () => new Prisma.Decimal(0);

    // ---- Buckets por dia (14 dias) e por hora (hoje) ----
    const byDay = new Map<string, { total: Prisma.Decimal; orders: number }>();
    const byHour = new Map<string, { total: Prisma.Decimal; orders: number }>();
    const byMethod = new Map<string, Prisma.Decimal>();

    for (const order of orders) {
      const day = dayFmt.format(order.createdAt);
      const d = byDay.get(day) ?? { total: zero(), orders: 0 };
      d.total = d.total.plus(order.total);
      d.orders += 1;
      byDay.set(day, d);

      if (day !== today) continue;

      const hour = hourFmt.format(order.createdAt);
      const h = byHour.get(hour) ?? { total: zero(), orders: 0 };
      h.total = h.total.plus(order.total);
      h.orders += 1;
      byHour.set(hour, h);

      for (const p of order.tab.payments) {
        byMethod.set(
          p.method,
          (byMethod.get(p.method) ?? zero()).plus(p.amount),
        );
      }
    }

    const dayTotal = (day: string) => byDay.get(day)?.total ?? zero();
    const dayOrders = (day: string) => byDay.get(day)?.orders ?? 0;

    const sumDays = (fromShift: number, toShift: number) => {
      let total = zero();
      let count = 0;
      for (let s = fromShift; s >= toShift; s--) {
        const day = isoDayShift(s);
        total = total.plus(dayTotal(day));
        count += dayOrders(day);
      }
      return { total, count };
    };

    const week = sumDays(6, 0);
    const prevWeek = sumDays(13, 7);
    const yesterday = isoDayShift(1);

    const salesToday = dayTotal(today);
    const ordersToday = dayOrders(today);
    const ticketToday = ordersToday
      ? salesToday.dividedBy(ordersToday)
      : zero();
    const ordersYesterday = dayOrders(yesterday);
    const ticketYesterday = ordersYesterday
      ? dayTotal(yesterday).dividedBy(ordersYesterday)
      : zero();

    // ---- Séries dos gráficos ----
    const salesByHour = Array.from({ length: 24 }, (_, i) => {
      const hour = String(i).padStart(2, '0');
      const v = byHour.get(hour);
      return {
        hour,
        total: (v?.total ?? zero()).toFixed(2),
        orders: v?.orders ?? 0,
      };
    });

    const salesByDay = Array.from({ length: 7 }, (_, i) => {
      const day = isoDayShift(6 - i);
      const v = byDay.get(day);
      return {
        date: day,
        // Rótulo curto ("seg.") para o eixo do gráfico.
        weekday: weekdayFmt.format(startOfDay(day)).replace('.', ''),
        total: (v?.total ?? zero()).toFixed(2),
        orders: v?.orders ?? 0,
      };
    });

    // ---- Operação ----
    const countOf = (status: TableStatus) =>
      tables.find((t) => t.status === status)?._count._all ?? 0;
    const tablesTotal = tables.reduce((n, t) => n + t._count._all, 0);
    const tablesOccupied =
      countOf(TableStatus.OCCUPIED) + countOf(TableStatus.AWAITING_PAYMENT);

    const kitchenTabs = new Set(kitchenItems.map((i) => i.tabId));
    const lateCutoff = Date.now() - LATE_MINUTES * 60_000;
    const lateTabs = new Set(
      kitchenItems
        .filter((i) => i.createdAt.getTime() < lateCutoff)
        .map((i) => i.tabId),
    );

    const paymentTotal = [...byMethod.values()].reduce(
      (acc, v) => acc.plus(v),
      zero(),
    );

    return {
      now: new Date().toISOString(),
      // O front usa isto para saber se esconde os blocos de dinheiro.
      showsRevenue: withMoney,
      summary: withMoney
        ? {
            salesToday: salesToday.toFixed(2),
            salesTodayChange: change(salesToday, dayTotal(yesterday)),
            salesWeek: week.total.toFixed(2),
            salesWeekChange: change(week.total, prevWeek.total),
            ordersToday,
            ordersTodayChange: changeInt(ordersToday, ordersYesterday),
            averageTicket: ticketToday.toFixed(2),
            averageTicketChange: change(ticketToday, ticketYesterday),
          }
        : null,
      salesByHour: withMoney
        ? salesByHour
        : salesByHour.map((h) => ({ ...h, total: '0.00' })),
      salesByDay: withMoney
        ? salesByDay
        : salesByDay.map((d) => ({ ...d, total: '0.00' })),
      operational: {
        tablesTotal,
        tablesOccupied,
        tablesFree: countOf(TableStatus.FREE),
        kitchenTabs: kitchenTabs.size,
        kitchenItems: kitchenItems.length,
        activeDeliveries: tabDeliveries + deliveryOrders,
      },
      paymentMethods: withMoney
        ? [...byMethod.entries()]
            .map(([method, total]) => ({
              method,
              total: total.toFixed(2),
              percent: paymentTotal.isZero()
                ? 0
                : Number(total.dividedBy(paymentTotal).times(100).toFixed(1)),
            }))
            .sort((a, b) => Number(b.total) - Number(a.total))
        : [],
      recentOrders: orders.slice(0, 6).map((o) => ({
        id: o.id,
        tabId: o.tab.id,
        label:
          o.tab.label ??
          (o.tab.table ? `Mesa ${o.tab.table.number}` : null) ??
          (o.tab.isDelivery ? 'Delivery' : 'Balcão'),
        kind: o.tab.isDelivery ? 'Delivery' : o.tab.table ? 'Mesa' : 'Balcão',
        customerName: o.tab.customer?.name ?? null,
        total: withMoney ? o.total.toFixed(2) : null,
        at: o.createdAt.toISOString(),
      })),
      alerts: {
        lateKitchenTabs: lateTabs.size,
        lateMinutes: LATE_MINUTES,
      },
    };
  }
}
