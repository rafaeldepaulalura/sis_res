import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { hasPermission, Permission } from './permissions';

export interface Authorizer {
  id: string;
  name: string;
}

@Injectable()
export class PinAuthService {
  constructor(private readonly prisma: PrismaService) {}

  // Autorização de balcão: o garçom continua logado e o gerente digita o PIN
  // dele para liberar a ação. Aceita o PIN de qualquer usuário ativo do
  // estabelecimento que TENHA a permissão exigida — quem não pode fazer a
  // ação também não pode autorizá-la.
  async authorize(
    establishmentId: string,
    pin: string | undefined,
    permission: Permission,
  ): Promise<Authorizer> {
    if (!pin?.trim()) {
      throw new BadRequestException('Informe o PIN para autorizar');
    }

    const candidates = await this.prisma.user.findMany({
      where: { establishmentId, active: true, pinCode: { not: null } },
      select: {
        id: true,
        name: true,
        role: true,
        permissions: true,
        pinCode: true,
      },
    });

    for (const user of candidates) {
      if (!hasPermission(user, [permission])) continue;
      if (await bcrypt.compare(pin, user.pinCode!)) {
        return { id: user.id, name: user.name };
      }
    }

    throw new ForbiddenException(
      'PIN inválido ou sem permissão para autorizar esta ação',
    );
  }

  // Lê as travas configuradas pelo restaurante.
  async settings(establishmentId: string) {
    const est = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: {
        requirePinForDiscount: true,
        requirePinForCancelItem: true,
      },
    });
    return {
      requirePinForDiscount: est?.requirePinForDiscount ?? false,
      requirePinForCancelItem: est?.requirePinForCancelItem ?? false,
    };
  }
}
