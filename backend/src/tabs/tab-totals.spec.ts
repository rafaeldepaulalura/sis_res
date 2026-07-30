import { TabItemStatus } from '@prisma/client';
import { computeTabTotals } from './tab-totals';

describe('computeTabTotals', () => {
  it('soma itens não cancelados (preço * quantidade)', () => {
    const { subtotal, total } = computeTabTotals([
      { unitPrice: '10.50', quantity: 2, status: TabItemStatus.PENDING }, // 21.00
      { unitPrice: '5.00', quantity: 3, status: TabItemStatus.READY }, // 15.00
    ]);
    expect(subtotal.toFixed(2)).toBe('36.00');
    expect(total.toFixed(2)).toBe('36.00');
  });

  it('ignora itens cancelados', () => {
    const { total } = computeTabTotals([
      { unitPrice: '10.00', quantity: 1, status: TabItemStatus.PENDING },
      { unitPrice: '99.99', quantity: 1, status: TabItemStatus.CANCELLED },
    ]);
    expect(total.toFixed(2)).toBe('10.00');
  });

  it('aplica desconto', () => {
    const { subtotal, discount, total } = computeTabTotals(
      [{ unitPrice: '100.00', quantity: 1, status: TabItemStatus.DELIVERED }],
      15.5,
    );
    expect(subtotal.toFixed(2)).toBe('100.00');
    expect(discount.toFixed(2)).toBe('15.50');
    expect(total.toFixed(2)).toBe('84.50');
  });

  it('não acumula erro de ponto flutuante', () => {
    const { total } = computeTabTotals([
      { unitPrice: '0.10', quantity: 3, status: TabItemStatus.PENDING }, // 0.30
    ]);
    expect(total.toFixed(2)).toBe('0.30');
  });

  it('retorna zero para comanda vazia', () => {
    const { total } = computeTabTotals([]);
    expect(total.toFixed(2)).toBe('0.00');
  });

  it('soma a taxa de entrega ao total', () => {
    const { subtotal, deliveryFee, total } = computeTabTotals(
      [{ unitPrice: '40.00', quantity: 1, status: TabItemStatus.PENDING }],
      0,
      8,
    );
    expect(subtotal.toFixed(2)).toBe('40.00');
    expect(deliveryFee.toFixed(2)).toBe('8.00');
    expect(total.toFixed(2)).toBe('48.00');
  });

  // O desconto é sobre o consumo; o frete o restaurante paga ao motoboy.
  it('aplica o desconto antes de somar a entrega', () => {
    const { total } = computeTabTotals(
      [{ unitPrice: '100.00', quantity: 1, status: TabItemStatus.PENDING }],
      20,
      10,
    );
    expect(total.toFixed(2)).toBe('90.00');
  });
});
