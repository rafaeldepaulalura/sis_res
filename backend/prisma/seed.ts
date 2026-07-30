import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SLUG = process.env.DEFAULT_ESTABLISHMENT_SLUG ?? 'meu-restaurante';

async function main() {
  console.log('🌱 Seed iniciado...');

  // ---- Estabelecimento (idempotente por slug) ----
  const establishment = await prisma.establishment.upsert({
    where: { slug: SLUG },
    update: {},
    create: {
      name: 'Meu Restaurante',
      slug: SLUG,
      cnpj: '12345678000199',
      address: 'Rua Exemplo, 123 - Centro',
      phone: '(11) 90000-0000',
      timezone: 'America/Sao_Paulo',
    },
  });
  console.log(`✅ Establishment: ${establishment.name} (${establishment.id})`);

  // ---- Usuários (admin + garçom) ----
  const adminPassword = await bcrypt.hash('admin123', 10);
  const pinHash = await bcrypt.hash('1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@restaurante.local' },
    update: {},
    create: {
      establishmentId: establishment.id,
      name: 'Administrador',
      email: 'admin@restaurante.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      pinCode: pinHash,
    },
  });
  console.log(`✅ Admin: ${admin.email} (senha: admin123 / PIN: 1234)`);

  // Super Admin global (Fase 2) — não pertence a nenhum estabelecimento.
  const superPassword = await bcrypt.hash('super123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@sistema.local' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@sistema.local',
      passwordHash: superPassword,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('✅ Super Admin: superadmin@sistema.local (senha: super123)');

  const waiterPassword = await bcrypt.hash('garcom123', 10);
  await prisma.user.upsert({
    where: { email: 'garcom@restaurante.local' },
    update: {},
    create: {
      establishmentId: establishment.id,
      name: 'Garçom Exemplo',
      email: 'garcom@restaurante.local',
      passwordHash: waiterPassword,
      role: Role.WAITER,
    },
  });
  console.log('✅ Garçom: garcom@restaurante.local (senha: garcom123)');

  // ---- Dados de exemplo (só cria se ainda não houver) ----
  const existingAreas = await prisma.roomArea.count({
    where: { establishmentId: establishment.id },
  });

  if (existingAreas === 0) {
    // Áreas + mesas
    const salao = await prisma.roomArea.create({
      data: { establishmentId: establishment.id, name: 'Salão Principal' },
    });
    const externa = await prisma.roomArea.create({
      data: { establishmentId: establishment.id, name: 'Área Externa' },
    });

    const tables: { number: number; roomAreaId: string }[] = [];
    for (let n = 1; n <= 8; n++) tables.push({ number: n, roomAreaId: salao.id });
    for (let n = 9; n <= 12; n++)
      tables.push({ number: n, roomAreaId: externa.id });

    await prisma.table.createMany({
      data: tables.map((t) => ({
        establishmentId: establishment.id,
        roomAreaId: t.roomAreaId,
        number: t.number,
      })),
    });
    console.log(`✅ ${tables.length} mesas criadas em 2 áreas`);
  } else {
    console.log('↩️  Áreas/mesas já existem, pulando');
  }

  const existingCategories = await prisma.category.count({
    where: { establishmentId: establishment.id },
  });

  if (existingCategories === 0) {
    const menu: {
      category: string;
      order: number;
      products: { name: string; price: number; description?: string }[];
    }[] = [
      {
        category: 'Entradas',
        order: 1,
        products: [
          { name: 'Bruschetta', price: 24.9, description: 'Pão italiano, tomate e manjericão' },
          { name: 'Bolinho de Bacalhau (6un)', price: 32.0 },
        ],
      },
      {
        category: 'Pratos Principais',
        order: 2,
        products: [
          { name: 'Filé à Parmegiana', price: 58.9, description: 'Acompanha arroz e fritas' },
          { name: 'Risoto de Camarão', price: 64.0 },
          { name: 'Hambúrguer Artesanal', price: 39.9 },
        ],
      },
      {
        category: 'Bebidas',
        order: 3,
        products: [
          { name: 'Refrigerante Lata', price: 7.0 },
          { name: 'Suco Natural', price: 12.0 },
          { name: 'Água Mineral', price: 5.0 },
        ],
      },
      {
        category: 'Sobremesas',
        order: 4,
        products: [
          { name: 'Pudim', price: 15.0 },
          { name: 'Petit Gateau', price: 22.0, description: 'Com sorvete de creme' },
        ],
      },
    ];

    for (const c of menu) {
      const category = await prisma.category.create({
        data: {
          establishmentId: establishment.id,
          name: c.category,
          order: c.order,
        },
      });
      await prisma.product.createMany({
        data: c.products.map((p) => ({
          establishmentId: establishment.id,
          categoryId: category.id,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
        })),
      });
    }
    const totalProducts = menu.reduce((n, c) => n + c.products.length, 0);
    console.log(
      `✅ ${menu.length} categorias e ${totalProducts} produtos criados`,
    );
  } else {
    console.log('↩️  Cardápio já existe, pulando');
  }

  console.log('🌱 Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
