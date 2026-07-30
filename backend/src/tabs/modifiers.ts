import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Grupo de complementos de um produto, no formato que a validação precisa.
export interface GroupSpec {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: {
    id: string;
    name: string;
    priceDelta: Prisma.Decimal;
    active: boolean;
  }[];
}

// O que fica gravado no item da comanda. É uma cópia: se o restaurante
// mudar o preço do bacon amanhã, o pedido de hoje continua com o valor
// que o cliente pagou.
export interface ModifierSnapshot {
  groupName: string;
  name: string;
  priceDelta: string;
}

export interface ResolvedModifiers {
  snapshot: ModifierSnapshot[];
  extra: Prisma.Decimal;
}

// Confere as escolhas contra as regras do grupo e soma o valor dos adicionais.
// Lança 400 com mensagem em português quando a escolha não fecha.
export function resolveModifiers(
  groups: GroupSpec[],
  optionIds: string[] | undefined,
): ResolvedModifiers {
  const chosen = [...new Set(optionIds ?? [])];
  const snapshot: ModifierSnapshot[] = [];
  let extra = new Prisma.Decimal(0);
  const known = new Set<string>();

  for (const group of groups) {
    const active = group.options.filter((o) => o.active);
    const picked = active.filter((o) => chosen.includes(o.id));
    active.forEach((o) => known.add(o.id));

    const min = group.required ? Math.max(1, group.minSelect) : group.minSelect;
    if (picked.length < min) {
      throw new BadRequestException(
        min === 1
          ? `Escolha uma opção em "${group.name}"`
          : `Escolha pelo menos ${min} opções em "${group.name}"`,
      );
    }
    if (group.maxSelect > 0 && picked.length > group.maxSelect) {
      throw new BadRequestException(
        group.maxSelect === 1
          ? `Só é possível escolher uma opção em "${group.name}"`
          : `Escolha no máximo ${group.maxSelect} opções em "${group.name}"`,
      );
    }

    for (const option of picked) {
      snapshot.push({
        groupName: group.name,
        name: option.name,
        priceDelta: option.priceDelta.toFixed(2),
      });
      extra = extra.plus(option.priceDelta);
    }
  }

  // Opção que não pertence a nenhum grupo do produto (ou está inativa):
  // recusa em vez de ignorar em silêncio, senão o preço sairia errado.
  const estranha = chosen.find((id) => !known.has(id));
  if (estranha) {
    throw new BadRequestException('Complemento inválido para este produto');
  }

  return { snapshot, extra };
}

// Texto curto das escolhas, usado na comanda impressa e na tela da cozinha.
export function modifiersLabel(snapshot: ModifierSnapshot[]): string {
  return snapshot.map((m) => m.name).join(', ');
}

// Include do Prisma para trazer os grupos de complementos junto do produto.
export const productModifierInclude = {
  modifierGroups: {
    orderBy: { order: 'asc' as const },
    include: {
      group: {
        include: {
          options: {
            orderBy: [{ order: 'asc' as const }, { name: 'asc' as const }],
          },
        },
      },
    },
  },
};

interface ProductWithGroups {
  modifierGroups: {
    group: {
      id: string;
      name: string;
      required: boolean;
      minSelect: number;
      maxSelect: number;
      active: boolean;
      options: {
        id: string;
        name: string;
        priceDelta: Prisma.Decimal;
        active: boolean;
      }[];
    };
  }[];
}

// Converte o produto carregado do banco no formato que a validação espera.
// Grupo desativado sai de cena sem quebrar pedidos antigos.
export function groupsOf(product: ProductWithGroups): GroupSpec[] {
  return product.modifierGroups
    .filter((link) => link.group.active)
    .map((link) => ({
      id: link.group.id,
      name: link.group.name,
      required: link.group.required,
      minSelect: link.group.minSelect,
      maxSelect: link.group.maxSelect,
      options: link.group.options,
    }));
}
