import { CashMovementType } from '@prisma/client';
import { computeExpectedCash } from './cash-expected';

describe('computeExpectedCash', () => {
  it('soma vendas e suprimentos, subtrai sangrias', () => {
    const expected = computeExpectedCash('100.00', [
      { type: CashMovementType.SALE, amount: '50.00' },
      { type: CashMovementType.DEPOSIT, amount: '20.00' },
      { type: CashMovementType.WITHDRAWAL, amount: '30.00' },
    ]);
    // 100 + 50 + 20 - 30 = 140
    expect(expected.toFixed(2)).toBe('140.00');
  });

  it('retorna a abertura quando não há movimentos', () => {
    expect(computeExpectedCash('200.00', []).toFixed(2)).toBe('200.00');
  });

  it('não acumula erro de ponto flutuante', () => {
    const expected = computeExpectedCash('0.00', [
      { type: CashMovementType.SALE, amount: '0.10' },
      { type: CashMovementType.SALE, amount: '0.20' },
    ]);
    expect(expected.toFixed(2)).toBe('0.30');
  });
});
