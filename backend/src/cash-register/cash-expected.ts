import { CashMovementType, Prisma } from '@prisma/client';

export interface ExpectedMovement {
  type: CashMovementType;
  amount: Prisma.Decimal | number | string;
}

// Função pura: dinheiro esperado na gaveta = abertura + vendas em dinheiro
// + suprimentos (DEPOSIT) − sangrias (WITHDRAWAL). Base da contagem cega.
export function computeExpectedCash(
  openingAmount: Prisma.Decimal | number | string,
  movements: ExpectedMovement[],
): Prisma.Decimal {
  let total = new Prisma.Decimal(openingAmount);
  for (const m of movements) {
    const amount = new Prisma.Decimal(m.amount);
    if (m.type === CashMovementType.WITHDRAWAL) {
      total = total.minus(amount);
    } else {
      // SALE e DEPOSIT entram na gaveta.
      total = total.plus(amount);
    }
  }
  return total;
}
