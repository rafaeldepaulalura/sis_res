import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementType, CashSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeExpectedCash } from './cash-expected';
import { CashMovementDto } from './dto/cash-movement.dto';

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  private findOpenSession(establishmentId: string) {
    return this.prisma.cashRegisterSession.findFirst({
      where: { establishmentId, status: CashSessionStatus.OPEN },
    });
  }

  // Status do caixa. Não revela o esperado (contagem cega).
  async getCurrent(establishmentId: string) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { establishmentId, status: CashSessionStatus.OPEN },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { movements: true } },
      },
    });
    if (!session) return { open: false as const };
    return {
      open: true as const,
      id: session.id,
      openedAt: session.openedAt,
      openingAmount: session.openingAmount.toFixed(2),
      operator: session.user,
      movements: session._count.movements,
    };
  }

  async open(establishmentId: string, userId: string, openingAmount: number) {
    const existing = await this.findOpenSession(establishmentId);
    if (existing) {
      throw new ConflictException('Já existe um caixa aberto');
    }
    return this.prisma.cashRegisterSession.create({
      data: {
        establishmentId,
        userId,
        openingAmount,
        status: CashSessionStatus.OPEN,
      },
    });
  }

  // Fechamento com contagem cega: compara o contado com o esperado.
  async close(establishmentId: string, countedAmount: number) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { establishmentId, status: CashSessionStatus.OPEN },
      include: { movements: true },
    });
    if (!session) {
      throw new ConflictException('Nenhum caixa aberto');
    }

    const expected = computeExpectedCash(
      session.openingAmount,
      session.movements,
    );
    const counted = new Prisma.Decimal(countedAmount);
    const difference = counted.minus(expected);

    await this.prisma.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        status: CashSessionStatus.CLOSED,
        closedAt: new Date(),
        closingAmount: counted,
      },
    });

    return {
      sessionId: session.id,
      expected: expected.toFixed(2),
      counted: counted.toFixed(2),
      difference: difference.toFixed(2), // negativo = falta; positivo = sobra
    };
  }

  async addMovement(establishmentId: string, dto: CashMovementDto) {
    const session = await this.findOpenSession(establishmentId);
    if (!session) {
      throw new NotFoundException('Nenhum caixa aberto');
    }
    return this.prisma.cashMovement.create({
      data: {
        cashRegisterSessionId: session.id,
        type: dto.type as CashMovementType,
        amount: dto.amount,
        description: dto.description ?? null,
      },
    });
  }

  // Registra uma venda em dinheiro na gaveta (chamado pelo fluxo de pagamento).
  // Sem caixa aberto, apenas ignora o movimento (o pagamento já foi gravado).
  async registerCashSale(
    establishmentId: string,
    amount: Prisma.Decimal | number,
    description: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const session = await client.cashRegisterSession.findFirst({
      where: { establishmentId, status: CashSessionStatus.OPEN },
    });
    if (!session) return null;
    return client.cashMovement.create({
      data: {
        cashRegisterSessionId: session.id,
        type: CashMovementType.SALE,
        amount,
        description,
      },
    });
  }
}
