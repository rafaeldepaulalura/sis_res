import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Produto no mínimo com o que a regra de meia a meia precisa.
export interface HalfCandidate {
  id: string;
  name: string;
  price: Prisma.Decimal;
  categoryId: string;
  category: { allowsHalf: boolean };
}

// Praxe das pizzarias no Brasil: a pizza meia a meia é cobrada pelo sabor
// mais caro. Ex.: metade Calabresa (R$30) + metade Muçarela (R$25) = R$30.
export function halfPrice(
  first: { price: Prisma.Decimal },
  second: { price: Prisma.Decimal },
): Prisma.Decimal {
  return second.price.greaterThan(first.price) ? second.price : first.price;
}

// Valida o 2º sabor: precisa existir, ser de categoria que permite meia a
// meia, estar na MESMA categoria do 1º (garante mesmo tamanho/tipo) e ser
// um sabor diferente.
export function assertHalfAllowed(
  first: HalfCandidate,
  second: HalfCandidate | null | undefined,
): asserts second is HalfCandidate {
  if (!second) {
    throw new BadRequestException('2º sabor inválido ou indisponível');
  }
  if (!first.category.allowsHalf) {
    throw new BadRequestException(`"${first.name}" não aceita meia a meia`);
  }
  if (first.categoryId !== second.categoryId) {
    throw new BadRequestException(
      'Os dois sabores precisam ser da mesma categoria (mesmo tamanho)',
    );
  }
  if (first.id === second.id) {
    throw new BadRequestException('Escolha dois sabores diferentes');
  }
}

// Rótulo exibido na comanda, na cozinha e no recibo.
export function halfLabel(firstName: string, secondName: string): string {
  return `½ ${firstName} + ½ ${secondName}`;
}
