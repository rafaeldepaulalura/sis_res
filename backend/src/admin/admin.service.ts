import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FiscalDocumentStatus,
  Prisma,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { SetResellerAdminDto } from './dto/set-reseller-admin.dto';
import { ChangePlanDto, UpdateResellerDto } from './dto/update-reseller.dto';

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Planos ----

  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { monthlyPrice: 'asc' } });
  }

  createPlan(dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: dto });
  }

  // ---- Revendedores ----

  private notesThisMonth(resellerId: string) {
    return this.prisma.fiscalDocument.count({
      where: {
        status: FiscalDocumentStatus.AUTHORIZED,
        createdAt: { gte: monthStart() },
        order: { establishment: { resellerId } },
      },
    });
  }

  async listResellers() {
    const resellers = await this.prisma.reseller.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { establishments: true } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        users: {
          where: { role: Role.RESELLER_ADMIN },
          select: { email: true },
          take: 1,
        },
      },
    });

    return Promise.all(
      resellers.map(async (r) => ({
        id: r.id,
        name: r.name,
        tradeName: r.tradeName,
        cnpj: r.cnpj,
        email: r.email,
        active: r.active,
        adminEmail: r.users[0]?.email ?? null,
        establishments: r._count.establishments,
        subscription: r.subscriptions[0]
          ? {
              status: r.subscriptions[0].status,
              plan: r.subscriptions[0].plan.name,
              monthlyPrice: r.subscriptions[0].plan.monthlyPrice.toFixed(2),
              currentPeriodEnd: r.subscriptions[0].currentPeriodEnd,
            }
          : null,
        notesThisMonth: await this.notesThisMonth(r.id),
      })),
    );
  }

  async createReseller(dto: CreateResellerDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado');

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (dto.periodDays ?? 30));

    return this.prisma.tenantTx(async (tx) => {
      const reseller = await tx.reseller.create({
        data: {
          name: dto.name,
          tradeName: dto.tradeName ?? null,
          cnpj: dto.cnpj,
          email: dto.email,
          phone: dto.phone ?? null,
          primaryColor: dto.primaryColor ?? undefined,
          subdomain: dto.subdomain ?? null,
        },
      });

      await tx.resellerSubscription.create({
        data: {
          resellerId: reseller.id,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          currentPeriodEnd: periodEnd,
        },
      });

      if (dto.adminEmail && dto.adminPassword) {
        const exists = await tx.user.findUnique({
          where: { email: dto.adminEmail },
        });
        if (exists) {
          throw new ConflictException('E-mail do admin já está em uso');
        }
        await tx.user.create({
          data: {
            name: `${reseller.name} (admin)`,
            email: dto.adminEmail,
            passwordHash: await bcrypt.hash(dto.adminPassword, 10),
            role: Role.RESELLER_ADMIN,
            resellerId: reseller.id,
          },
        });
      }

      return reseller;
    });
  }

  async updateReseller(id: string, dto: UpdateResellerDto) {
    const reseller = await this.prisma.reseller.findUnique({ where: { id } });
    if (!reseller) throw new NotFoundException('Revendedor não encontrado');
    return this.prisma.reseller.update({ where: { id }, data: dto });
  }

  // Exclusão do revendedor: usuários e assinaturas dele são removidos em
  // cascata; os estabelecimentos NÃO são apagados — apenas desvinculados
  // (viram estabelecimentos "diretos", sem revendedor), preservando o
  // histórico e o acesso dos donos dos restaurantes.
  async deleteReseller(id: string) {
    const reseller = await this.prisma.reseller.findUnique({ where: { id } });
    if (!reseller) throw new NotFoundException('Revendedor não encontrado');
    await this.prisma.reseller.delete({ where: { id } });
    return { deleted: true };
  }

  // Cria o usuário de acesso do revendedor (se não existir) ou troca a senha.
  async setResellerAdmin(id: string, dto: SetResellerAdminDto) {
    const reseller = await this.prisma.reseller.findUnique({ where: { id } });
    if (!reseller) throw new NotFoundException('Revendedor não encontrado');

    const existing = await this.prisma.user.findFirst({
      where: { resellerId: id, role: Role.RESELLER_ADMIN },
    });
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Troca de senha (e opcionalmente do e-mail de login).
    if (existing) {
      if (dto.email && dto.email !== existing.email) {
        const taken = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });
        if (taken) throw new ConflictException('E-mail já está em uso');
      }
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, ...(dto.email ? { email: dto.email } : {}) },
        select: { email: true },
      });
      return { email: updated.email, created: false };
    }

    // Primeiro acesso: precisa do e-mail.
    if (!dto.email) {
      throw new BadRequestException(
        'Informe o e-mail para criar o acesso do revendedor',
      );
    }
    const taken = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (taken) throw new ConflictException('E-mail já está em uso');

    const created = await this.prisma.user.create({
      data: {
        name: `${reseller.name} (admin)`,
        email: dto.email,
        passwordHash,
        role: Role.RESELLER_ADMIN,
        resellerId: id,
      },
      select: { email: true },
    });
    return { email: created.email, created: true };
  }

  async changePlan(id: string, dto: ChangePlanDto) {
    const sub = await this.prisma.resellerSubscription.findFirst({
      where: { resellerId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('Assinatura não encontrada');
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return this.prisma.resellerSubscription.update({
      where: { id: sub.id },
      data: { planId: plan.id },
    });
  }

  // ---- Métricas ----

  async metrics() {
    const [activeResellers, totalEstablishments, activeSubs, notes] =
      await Promise.all([
        this.prisma.reseller.count({ where: { active: true } }),
        this.prisma.establishment.count(),
        this.prisma.resellerSubscription.findMany({
          where: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
            },
          },
          include: { plan: { select: { monthlyPrice: true } } },
        }),
        this.prisma.fiscalDocument.count({
          where: {
            status: FiscalDocumentStatus.AUTHORIZED,
            createdAt: { gte: monthStart() },
          },
        }),
      ]);

    const mrr = activeSubs.reduce(
      (acc, s) => acc.plus(s.plan.monthlyPrice),
      new Prisma.Decimal(0),
    );

    return {
      activeResellers,
      totalEstablishments,
      mrr: mrr.toFixed(2),
      notesThisMonth: notes,
    };
  }
}
