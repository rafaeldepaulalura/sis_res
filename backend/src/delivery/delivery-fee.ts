import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface DeliverySettings {
  deliveryFee: Prisma.Decimal;
  deliveryMinOrder: Prisma.Decimal;
  deliveryFreeAbove: Prisma.Decimal | null;
}

export interface Zone {
  neighborhood: string;
  fee: Prisma.Decimal;
  active: boolean;
}

export interface FeeResult {
  fee: Prisma.Decimal;
  // Por que deu esse valor — usado para explicar na tela do cliente.
  reason: 'free_above' | 'zone' | 'default';
}

// Compara bairro ignorando acento, caixa e espaço extra: o cliente digita
// "Sao Joao" e o cadastro tem "São João".
function normalize(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Decide a taxa da entrega. Ordem: frete grátis por valor > bairro > padrão.
export function resolveDeliveryFee(
  settings: DeliverySettings,
  zones: Zone[],
  neighborhood: string | null | undefined,
  subtotal: Prisma.Decimal,
): FeeResult {
  if (
    settings.deliveryFreeAbove !== null &&
    subtotal.greaterThanOrEqualTo(settings.deliveryFreeAbove)
  ) {
    return { fee: new Prisma.Decimal(0), reason: 'free_above' };
  }

  const zone = neighborhood
    ? zones.find((z) => normalize(z.neighborhood) === normalize(neighborhood))
    : undefined;

  if (zone) {
    if (!zone.active) {
      throw new BadRequestException(
        `No momento não entregamos em ${zone.neighborhood}`,
      );
    }
    return { fee: zone.fee, reason: 'zone' };
  }

  return { fee: settings.deliveryFee, reason: 'default' };
}

// Barra o pedido abaixo do mínimo — com a mensagem que o cliente precisa ler.
export function assertMinOrder(
  settings: DeliverySettings,
  subtotal: Prisma.Decimal,
): void {
  if (
    settings.deliveryMinOrder.greaterThan(0) &&
    subtotal.lessThan(settings.deliveryMinOrder)
  ) {
    throw new BadRequestException(
      `Pedido mínimo para entrega: R$ ${settings.deliveryMinOrder.toFixed(2).replace('.', ',')}`,
    );
  }
}
