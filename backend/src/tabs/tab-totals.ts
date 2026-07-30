import { Prisma, TabItemStatus } from '@prisma/client';

export interface TotalItem {
  unitPrice: Prisma.Decimal | number | string;
  quantity: number;
  status: TabItemStatus;
}

export interface TabTotals {
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  total: Prisma.Decimal;
}

// Função pura: soma itens não cancelados (unitPrice * quantidade), aplica
// desconto e soma a taxa de entrega. Usa Decimal para evitar erro de ponto
// flutuante. Testável isolada.
export function computeTabTotals(
  items: TotalItem[],
  discount: Prisma.Decimal | number | string = 0,
  deliveryFee: Prisma.Decimal | number | string = 0,
): TabTotals {
  const subtotal = items
    .filter((i) => i.status !== TabItemStatus.CANCELLED)
    .reduce(
      (acc, i) => acc.plus(new Prisma.Decimal(i.unitPrice).times(i.quantity)),
      new Prisma.Decimal(0),
    );

  const disc = new Prisma.Decimal(discount);
  const frete = new Prisma.Decimal(deliveryFee);
  // A taxa entra depois do desconto: desconto é sobre o consumo, não sobre
  // o frete que o restaurante paga ao motoboy.
  const total = subtotal.minus(disc).plus(frete);

  return { subtotal, discount: disc, deliveryFee: frete, total };
}
