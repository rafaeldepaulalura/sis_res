import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  assertMinOrder,
  DeliverySettings,
  resolveDeliveryFee,
  Zone,
} from './delivery-fee';

const dec = (v: number | string) => new Prisma.Decimal(v);

const settings = (over: Partial<DeliverySettings> = {}): DeliverySettings => ({
  deliveryFee: dec(8),
  deliveryMinOrder: dec(0),
  deliveryFreeAbove: null,
  ...over,
});

const zonas: Zone[] = [
  { neighborhood: 'Centro', fee: dec(5), active: true },
  { neighborhood: 'São João', fee: dec(12), active: true },
  { neighborhood: 'Zona Rural', fee: dec(20), active: false },
];

describe('resolveDeliveryFee', () => {
  it('usa a taxa padrão quando o bairro não está cadastrado', () => {
    const r = resolveDeliveryFee(settings(), zonas, 'Bairro Novo', dec(50));
    expect(r.fee.toFixed(2)).toBe('8.00');
    expect(r.reason).toBe('default');
  });

  it('usa a taxa do bairro quando existe', () => {
    const r = resolveDeliveryFee(settings(), zonas, 'Centro', dec(50));
    expect(r.fee.toFixed(2)).toBe('5.00');
    expect(r.reason).toBe('zone');
  });

  it('casa o bairro ignorando acento e caixa', () => {
    for (const escrito of ['sao joao', 'SÃO JOÃO', '  São João  ']) {
      const r = resolveDeliveryFee(settings(), zonas, escrito, dec(50));
      expect(r.fee.toFixed(2)).toBe('12.00');
    }
  });

  it('recusa entrega em bairro desativado', () => {
    expect(() =>
      resolveDeliveryFee(settings(), zonas, 'Zona Rural', dec(50)),
    ).toThrow(BadRequestException);
    expect(() =>
      resolveDeliveryFee(settings(), zonas, 'Zona Rural', dec(50)),
    ).toThrow('No momento não entregamos em Zona Rural');
  });

  it('zera a taxa acima do valor de frete grátis', () => {
    const s = settings({ deliveryFreeAbove: dec(80) });
    const r = resolveDeliveryFee(s, zonas, 'São João', dec(80));
    expect(r.fee.toFixed(2)).toBe('0.00');
    expect(r.reason).toBe('free_above');
  });

  it('frete grátis vence até a taxa do bairro', () => {
    const s = settings({ deliveryFreeAbove: dec(50) });
    const r = resolveDeliveryFee(s, zonas, 'Centro', dec(60));
    expect(r.fee.toFixed(2)).toBe('0.00');
  });

  it('abaixo do valor de frete grátis cobra normal', () => {
    const s = settings({ deliveryFreeAbove: dec(80) });
    const r = resolveDeliveryFee(s, zonas, 'Centro', dec(79.99));
    expect(r.fee.toFixed(2)).toBe('5.00');
  });

  it('sem bairro informado cai na taxa padrão', () => {
    const r = resolveDeliveryFee(settings(), zonas, null, dec(30));
    expect(r.fee.toFixed(2)).toBe('8.00');
  });
});

describe('assertMinOrder', () => {
  it('deixa passar quando não há mínimo', () => {
    expect(() => assertMinOrder(settings(), dec(1))).not.toThrow();
  });

  it('barra abaixo do mínimo com o valor na mensagem', () => {
    const s = settings({ deliveryMinOrder: dec(30) });
    expect(() => assertMinOrder(s, dec(29.9))).toThrow(
      'Pedido mínimo para entrega: R$ 30,00',
    );
  });

  it('aceita exatamente o mínimo', () => {
    const s = settings({ deliveryMinOrder: dec(30) });
    expect(() => assertMinOrder(s, dec(30))).not.toThrow();
  });
});
