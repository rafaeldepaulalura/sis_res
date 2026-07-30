import { AsyncLocalStorage } from 'node:async_hooks';

// Contexto de tenant propagado por request via AsyncLocalStorage.
// - establishmentId: escopo operacional (PDV).
// - resellerId: escopo do painel do revendedor.
// - bypass: Super Admin / auth / rotas públicas (ignora RLS deliberadamente).
export interface TenantStore {
  establishmentId?: string;
  resellerId?: string;
  bypass?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getTenant(): TenantStore | undefined {
  return tenantStorage.getStore();
}

export function runInTenant<T>(store: TenantStore, fn: () => T): T {
  return tenantStorage.run(store, fn);
}

// Executa fn ignorando o RLS (auth pré-contexto, rotas públicas, Super Admin).
// Aguarda fn() DENTRO do escopo do ALS — queries do Prisma são lazy e só
// executam quando aguardadas; sem o await aqui o contexto se perderia.
export function runBypass<T>(fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ bypass: true }, async () => {
    return await fn();
  });
}
