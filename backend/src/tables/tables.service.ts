import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TableStatus, TabStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_STATUSES: TabStatus[] = [TabStatus.OPEN, TabStatus.AWAITING_PAYMENT];

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Gestão de áreas ----

  createArea(establishmentId: string, name: string) {
    return this.prisma.roomArea.create({ data: { establishmentId, name } });
  }

  async deleteArea(establishmentId: string, id: string) {
    const area = await this.prisma.roomArea.findFirst({
      where: { id, establishmentId },
      include: { _count: { select: { tables: true } } },
    });
    if (!area) throw new NotFoundException('Área não encontrada');
    if (area._count.tables > 0) {
      throw new ConflictException(
        'Área possui mesas. Remova as mesas antes de excluir.',
      );
    }
    await this.prisma.roomArea.delete({ where: { id } });
    return { deleted: true };
  }

  // ---- Gestão de mesas ----

  async createTable(
    establishmentId: string,
    roomAreaId: string,
    number: number,
  ) {
    const area = await this.prisma.roomArea.findFirst({
      where: { id: roomAreaId, establishmentId },
    });
    if (!area) throw new BadRequestException('Área inválida');

    const exists = await this.prisma.table.findFirst({
      where: { establishmentId, number },
    });
    if (exists) {
      throw new ConflictException(`Já existe a mesa nº ${number}`);
    }
    return this.prisma.table.create({
      data: { establishmentId, roomAreaId, number },
    });
  }

  async deleteTable(establishmentId: string, id: string) {
    const table = await this.prisma.table.findFirst({
      where: { id, establishmentId },
      include: {
        tabs: { where: { status: { in: OPEN_STATUSES } }, take: 1 },
      },
    });
    if (!table) throw new NotFoundException('Mesa não encontrada');
    if (table.tabs.length > 0) {
      throw new ConflictException('Mesa possui comanda aberta.');
    }
    await this.prisma.table.delete({ where: { id } });
    return { deleted: true };
  }

  // Mapa de mesas com status e a comanda aberta (se houver).
  async findAllTables(establishmentId: string) {
    const tables = await this.prisma.table.findMany({
      where: { establishmentId },
      orderBy: { number: 'asc' },
      include: {
        roomArea: { select: { id: true, name: true } },
        tabs: {
          where: { status: { in: OPEN_STATUSES } },
          select: { id: true, status: true, openedAt: true },
          take: 1,
        },
      },
    });
    return tables.map((t) => ({
      id: t.id,
      number: t.number,
      status: t.status,
      roomArea: t.roomArea,
      openTab: t.tabs[0] ?? null,
    }));
  }

  findRoomAreas(establishmentId: string) {
    return this.prisma.roomArea.findMany({
      where: { establishmentId },
      orderBy: { name: 'asc' },
      include: {
        tables: {
          orderBy: { number: 'asc' },
          select: { id: true, number: true, status: true },
        },
      },
    });
  }

  // Transfere a comanda aberta da mesa de origem para uma mesa livre.
  async transfer(
    establishmentId: string,
    fromTableId: string,
    toTableId: string,
  ) {
    if (fromTableId === toTableId) {
      throw new BadRequestException('Mesa de destino igual à de origem');
    }

    const source = await this.prisma.table.findFirst({
      where: { id: fromTableId, establishmentId },
      include: {
        tabs: { where: { status: { in: OPEN_STATUSES } }, take: 1 },
      },
    });
    if (!source) throw new NotFoundException('Mesa de origem não encontrada');
    const tab = source.tabs[0];
    if (!tab) {
      throw new BadRequestException('Mesa de origem não possui comanda aberta');
    }

    const target = await this.prisma.table.findFirst({
      where: { id: toTableId, establishmentId },
    });
    if (!target) throw new NotFoundException('Mesa de destino não encontrada');
    if (target.status !== TableStatus.FREE) {
      throw new ConflictException('Mesa de destino não está livre');
    }

    await this.prisma.tenantTx(async (tx) => {
      await tx.tab.update({
        where: { id: tab.id },
        data: { tableId: toTableId },
      });
      await tx.table.update({
        where: { id: fromTableId },
        data: { status: TableStatus.FREE },
      });
      await tx.table.update({
        where: { id: toTableId },
        data: { status: TableStatus.OCCUPIED },
      });
    });

    return {
      transferred: true,
      tabId: tab.id,
      fromTableId,
      toTableId,
    };
  }

  // Junta duas mesas numa conta só: os itens da origem passam para o destino
  // e a mesa de origem fica livre. Usado quando o grupo se reuniu numa mesa.
  async merge(establishmentId: string, fromTableId: string, toTableId: string) {
    if (fromTableId === toTableId) {
      throw new BadRequestException('Escolha duas mesas diferentes');
    }

    const [source, target] = await Promise.all([
      this.openTabOfTable(establishmentId, fromTableId, 'origem'),
      this.openTabOfTable(establishmentId, toTableId, 'destino'),
    ]);

    // Comanda já consolidada em pedido não pode receber nem doar itens.
    for (const t of [source, target]) {
      if (t.tab.order) {
        throw new ConflictException(
          'Uma das comandas já foi fechada em pedido',
        );
      }
      if (t.tab.isDelivery) {
        throw new BadRequestException(
          'Comanda de entrega não pode ser juntada a uma mesa',
        );
      }
    }

    await this.prisma.tenantTx(async (tx) => {
      // Itens e pagamentos migram para a comanda que fica.
      await tx.tabItem.updateMany({
        where: { tabId: source.tab.id },
        data: { tabId: target.tab.id },
      });
      await tx.payment.updateMany({
        where: { tabId: source.tab.id },
        data: { tabId: target.tab.id },
      });
      // Mantém o tableId de origem: o mapa só mostra comanda ABERTA, então
      // isso não prende a mesa e preserva de qual mesa a conta veio.
      await tx.tab.update({
        where: { id: source.tab.id },
        data: {
          status: TabStatus.CLOSED,
          closedAt: new Date(),
          mergedIntoId: target.tab.id,
        },
      });
      await tx.table.update({
        where: { id: fromTableId },
        data: { status: TableStatus.FREE },
      });
    });

    return {
      merged: true,
      tabId: target.tab.id,
      fromTableId,
      toTableId,
    };
  }

  // Carrega a mesa com a comanda aberta dela, ou explica o que faltou.
  private async openTabOfTable(
    establishmentId: string,
    tableId: string,
    papel: 'origem' | 'destino',
  ) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, establishmentId },
      include: {
        tabs: {
          where: { status: { in: OPEN_STATUSES } },
          take: 1,
          include: { order: true },
        },
      },
    });
    if (!table) {
      throw new NotFoundException(`Mesa de ${papel} não encontrada`);
    }
    const tab = table.tabs[0];
    if (!tab) {
      throw new BadRequestException(
        `Mesa de ${papel} não possui comanda aberta`,
      );
    }
    return { table, tab };
  }
}
