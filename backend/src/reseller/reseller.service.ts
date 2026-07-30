import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FiscalDocumentStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

@Injectable()
export class ResellerService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Estabelecimentos ----

  async listEstablishments(resellerId: string) {
    // Contexto do revendedor: RLS já limita a Establishment do resellerId.
    const establishments = await this.prisma.establishment.findMany({
      where: { resellerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        cnpj: true,
        address: true,
        phone: true,
        active: true,
        fiscalDocumentQuota: true,
        createdAt: true,
      },
    });

    // Última venda por establishment (Order é RLS por establishmentId → bypass
    // com filtro explícito nos ids do revendedor).
    const ids = establishments.map((e) => e.id);
    const lastSales = ids.length
      ? await runBypass(() =>
          this.prisma.order.groupBy({
            by: ['establishmentId'],
            where: { establishmentId: { in: ids } },
            _max: { createdAt: true },
          }),
        )
      : [];
    const lastByEst = new Map(
      lastSales.map((s) => [s.establishmentId, s._max.createdAt]),
    );

    return establishments.map((e) => ({
      ...e,
      lastSale: lastByEst.get(e.id) ?? null,
    }));
  }

  async createEstablishment(resellerId: string, dto: CreateEstablishmentDto) {
    return this.prisma.tenantTx(async (tx) => {
      const est = await tx.establishment.create({
        data: {
          resellerId,
          name: dto.name,
          slug: slugify(dto.name),
          cnpj: dto.cnpj,
          address: dto.address ?? null,
          phone: dto.phone ?? null,
        },
      });

      // Admin inicial: precisa do contexto do próprio establishment para o
      // WITH CHECK do RLS de User.
      await tx.$executeRaw`SELECT set_config('app.current_establishment_id', ${est.id}, true)`;

      const exists = await runBypass(() =>
        this.prisma.user.findUnique({ where: { email: dto.adminEmail } }),
      );
      if (exists) throw new ConflictException('E-mail do admin já está em uso');

      await tx.user.create({
        data: {
          establishmentId: est.id,
          name: dto.adminName ?? `${dto.name} (admin)`,
          email: dto.adminEmail,
          passwordHash: await bcrypt.hash(dto.adminPassword, 10),
          role: Role.ADMIN,
        },
      });

      return est;
    });
  }

  async updateEstablishment(
    resellerId: string,
    id: string,
    dto: UpdateEstablishmentDto,
  ) {
    const est = await this.prisma.establishment.findFirst({
      where: { id, resellerId },
    });
    if (!est) throw new NotFoundException('Estabelecimento não encontrado');

    if (dto.cnpj && dto.cnpj !== est.cnpj) {
      const taken = await runBypass(() =>
        this.prisma.establishment.findFirst({ where: { cnpj: dto.cnpj } }),
      );
      if (taken) throw new ConflictException('CNPJ já cadastrado');
    }

    return this.prisma.establishment.update({ where: { id }, data: dto });
  }

  // Exclusão definitiva: cascade apaga todo o histórico do estabelecimento
  // (comandas, pedidos, clientes etc.) — runBypass necessário pois o revendedor
  // não tem establishmentId no contexto de tenant para as tabelas-filhas.
  async deleteEstablishment(resellerId: string, id: string) {
    const est = await this.prisma.establishment.findFirst({
      where: { id, resellerId },
    });
    if (!est) throw new NotFoundException('Estabelecimento não encontrado');
    await runBypass(() => this.prisma.establishment.delete({ where: { id } }));
    return { deleted: true };
  }

  // ---- Branding ----

  async getBranding(resellerId: string) {
    const r = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        logoUrl: true,
        primaryColor: true,
      },
    });
    if (!r) throw new NotFoundException('Revendedor não encontrado');
    return r;
  }

  updateBranding(resellerId: string, dto: UpdateBrandingDto) {
    return this.prisma.reseller.update({
      where: { id: resellerId },
      data: dto,
      select: {
        id: true,
        name: true,
        tradeName: true,
        logoUrl: true,
        primaryColor: true,
      },
    });
  }

  // ---- Uso de notas ----

  async getUsage(resellerId: string) {
    const subscription = await this.prisma.resellerSubscription.findFirst({
      where: { resellerId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    const includedQuota = subscription?.plan.includedFiscalDocuments ?? 0;

    const establishments = await this.prisma.establishment.findMany({
      where: { resellerId },
      select: { id: true, name: true },
    });
    const ids = establishments.map((e) => e.id);

    // Consumo por establishment no mês (FiscalDocument → Order → Establishment).
    const consumptionByEst = await runBypass(async () => {
      const results = await Promise.all(
        ids.map(async (id) => ({
          id,
          consumed: await this.prisma.fiscalDocument.count({
            where: {
              status: FiscalDocumentStatus.AUTHORIZED,
              createdAt: { gte: monthStart() },
              order: { establishmentId: id },
            },
          }),
        })),
      );
      return results;
    });

    const consumed = consumptionByEst.reduce((a, c) => a + c.consumed, 0);
    const byEstMap = new Map(consumptionByEst.map((c) => [c.id, c.consumed]));

    return {
      plan: subscription?.plan.name ?? null,
      includedQuota,
      extraPurchased: 0, // Bloco 6 (compra avulsa)
      consumed,
      remaining: Math.max(0, includedQuota - consumed),
      byEstablishment: establishments.map((e) => ({
        id: e.id,
        name: e.name,
        consumed: byEstMap.get(e.id) ?? 0,
      })),
    };
  }
}
