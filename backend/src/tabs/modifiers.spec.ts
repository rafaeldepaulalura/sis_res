import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GroupSpec, resolveModifiers } from './modifiers';

const opt = (id: string, name: string, price = 0, active = true) => ({
  id,
  name,
  priceDelta: new Prisma.Decimal(price),
  active,
});

// "Ponto da carne": obrigatório, escolhe exatamente um.
const ponto: GroupSpec = {
  id: 'g1',
  name: 'Ponto da carne',
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [opt('mal', 'Mal passado'), opt('ponto', 'Ao ponto')],
};

// "Adicionais": opcional, até dois, com preço.
const adicionais: GroupSpec = {
  id: 'g2',
  name: 'Adicionais',
  required: false,
  minSelect: 0,
  maxSelect: 2,
  options: [
    opt('bacon', 'Bacon', 5),
    opt('queijo', 'Queijo extra', 3.5),
    opt('ovo', 'Ovo', 2),
    opt('off', 'Cebola caramelizada', 4, false),
  ],
};

describe('resolveModifiers', () => {
  it('soma o preço dos adicionais escolhidos', () => {
    const r = resolveModifiers([ponto, adicionais], ['ponto', 'bacon', 'ovo']);
    expect(r.extra.toFixed(2)).toBe('7.00');
    expect(r.snapshot.map((s) => s.name)).toEqual(['Ao ponto', 'Bacon', 'Ovo']);
  });

  it('grava o preço do momento (não muda se o cardápio mudar depois)', () => {
    const r = resolveModifiers([adicionais], ['bacon']);
    expect(r.snapshot[0]).toEqual({
      groupName: 'Adicionais',
      name: 'Bacon',
      priceDelta: '5.00',
    });
  });

  it('exige escolha no grupo obrigatório', () => {
    expect(() => resolveModifiers([ponto], [])).toThrow(BadRequestException);
    expect(() => resolveModifiers([ponto], [])).toThrow(
      'Escolha uma opção em "Ponto da carne"',
    );
  });

  it('recusa mais opções que o máximo do grupo', () => {
    expect(() =>
      resolveModifiers([adicionais], ['bacon', 'queijo', 'ovo']),
    ).toThrow('Escolha no máximo 2 opções em "Adicionais"');
  });

  it('recusa duas escolhas onde só cabe uma', () => {
    expect(() => resolveModifiers([ponto], ['mal', 'ponto'])).toThrow(
      'Só é possível escolher uma opção em "Ponto da carne"',
    );
  });

  it('recusa opção inativa (saiu do cardápio)', () => {
    expect(() => resolveModifiers([adicionais], ['off'])).toThrow(
      'Complemento inválido para este produto',
    );
  });

  it('recusa opção que não é do produto — evita preço errado', () => {
    expect(() => resolveModifiers([adicionais], ['borda-catupiry'])).toThrow(
      'Complemento inválido para este produto',
    );
  });

  it('grupo opcional sem escolha é válido e não soma nada', () => {
    const r = resolveModifiers([adicionais], []);
    expect(r.snapshot).toEqual([]);
    expect(r.extra.toFixed(2)).toBe('0.00');
  });

  it('produto sem complementos aceita lista vazia', () => {
    const r = resolveModifiers([], undefined);
    expect(r.extra.toFixed(2)).toBe('0.00');
  });

  it('ignora id repetido em vez de cobrar duas vezes', () => {
    const r = resolveModifiers([adicionais], ['bacon', 'bacon']);
    expect(r.extra.toFixed(2)).toBe('5.00');
  });
});
