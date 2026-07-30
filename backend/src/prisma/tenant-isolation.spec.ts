import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from './prisma.service';
import { runInTenant } from './tenant-context';

// Teste de integração de RLS (precisa do Postgres rodando).
// Prova o isolamento entre estabelecimentos exigido pela Fase 2.
const OWNER =
  process.env.DATABASE_URL ??
  'postgresql://restaurante:restaurante@localhost:5432/restaurante_saas?schema=public';
const APP =
  process.env.APP_DATABASE_URL ??
  'postgresql://app_user:app_user_pw@localhost:5432/restaurante_saas?schema=public';

describe('RLS — isolamento entre tenants', () => {
  const owner = new PrismaClient({ datasources: { db: { url: OWNER } } });
  const app = createPrismaClient(APP);
  const tag = Date.now();

  let estA: { id: string };
  let estB: { id: string };
  let prodA: { id: string; categoryId: string };
  let prodB: { id: string; categoryId: string };

  // Contexto do Estabelecimento A executando queries pelo client da aplicação.
  const asA = <T>(fn: () => Promise<T>) =>
    runInTenant({ establishmentId: estA.id }, async () => await fn());

  beforeAll(async () => {
    // Owner (superuser) bypassa RLS para montar o cenário.
    estA = await owner.establishment.create({
      data: { name: 'RLS A', slug: `rls-a-${tag}`, cnpj: `A${tag}` },
    });
    estB = await owner.establishment.create({
      data: { name: 'RLS B', slug: `rls-b-${tag}`, cnpj: `B${tag}` },
    });
    const catA = await owner.category.create({
      data: { establishmentId: estA.id, name: 'catA' },
    });
    const catB = await owner.category.create({
      data: { establishmentId: estB.id, name: 'catB' },
    });
    prodA = await owner.product.create({
      data: {
        establishmentId: estA.id,
        categoryId: catA.id,
        name: 'prodA',
        price: 1,
      },
    });
    prodB = await owner.product.create({
      data: {
        establishmentId: estB.id,
        categoryId: catB.id,
        name: 'prodB',
        price: 1,
      },
    });
  }, 30000);

  afterAll(async () => {
    await owner.establishment.deleteMany({
      where: { id: { in: [estA.id, estB.id] } },
    });
    await owner.$disconnect();
    await app.$disconnect();
  });

  it('A lê os próprios produtos e NÃO os de B', async () => {
    const list = await asA(() => app.product.findMany());
    expect(list.some((p) => p.id === prodA.id)).toBe(true);
    expect(list.some((p) => p.id === prodB.id)).toBe(false);
  });

  it('A não acessa produto de B por id (payload adulterado)', async () => {
    const found = await asA(() =>
      app.product.findUnique({ where: { id: prodB.id } }),
    );
    expect(found).toBeNull();
  });

  it('A não consegue ESCREVER no establishment de B', async () => {
    await expect(
      asA(() =>
        app.product.create({
          data: {
            establishmentId: estB.id, // tenta gravar no tenant de B
            categoryId: prodB.categoryId,
            name: 'invasor',
            price: 1,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('A não consegue ATUALIZAR produto de B', async () => {
    await expect(
      asA(() =>
        app.product.update({
          where: { id: prodB.id },
          data: { name: 'hackeado' },
        }),
      ),
    ).rejects.toThrow();
    // Confirma que o dado de B permaneceu intacto (visto pelo owner).
    const check = await owner.product.findUnique({ where: { id: prodB.id } });
    expect(check?.name).toBe('prodB');
  });

  it('sem contexto de tenant, nada é lido (deny por padrão)', async () => {
    const list = await app.product.findMany();
    expect(list.length).toBe(0);
  });
});
