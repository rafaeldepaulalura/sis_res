import { PrismaClient, Prisma } from '@prisma/client';
import { getTenant, type TenantStore } from './tenant-context';

// Contrato injetado nos services (token + tipo). A instância real é o client
// estendido com RLS — ver createPrismaClient().
export abstract class PrismaService extends PrismaClient {
  // Transação interativa que aplica o contexto de tenant (RLS) na conexão.
  abstract tenantTx<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
}

// Monta as instruções SET LOCAL a partir do contexto atual.
function setConfigStatements(
  client: PrismaClient,
  ctx: TenantStore | undefined,
): Prisma.PrismaPromise<unknown>[] {
  if (!ctx) return [];
  if (ctx.bypass) {
    return [
      client.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
    ];
  }
  const stmts: Prisma.PrismaPromise<unknown>[] = [];
  if (ctx.establishmentId) {
    stmts.push(
      client.$executeRaw`SELECT set_config('app.current_establishment_id', ${ctx.establishmentId}, true)`,
    );
  }
  if (ctx.resellerId) {
    stmts.push(
      client.$executeRaw`SELECT set_config('app.current_reseller_id', ${ctx.resellerId}, true)`,
    );
  }
  return stmts;
}

// Cria o PrismaClient conectado como app_user, com a extensão que garante
// que TODA query rode com o app.current_establishment_id do request (RLS).
export function createPrismaClient(url: string) {
  const base = new PrismaClient({ datasources: { db: { url } } });

  return base.$extends({
    client: {
      async tenantTx<T>(
        fn: (tx: Prisma.TransactionClient) => Promise<T>,
      ): Promise<T> {
        const ctx = getTenant();
        return base.$transaction(async (tx) => {
          if (ctx?.bypass) {
            await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
          } else {
            if (ctx?.establishmentId) {
              await tx.$executeRaw`SELECT set_config('app.current_establishment_id', ${ctx.establishmentId}, true)`;
            }
            if (ctx?.resellerId) {
              await tx.$executeRaw`SELECT set_config('app.current_reseller_id', ${ctx.resellerId}, true)`;
            }
          }
          return fn(tx);
        });
      },
    },
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const ctx = getTenant();
          const stmts = setConfigStatements(base, ctx);
          if (stmts.length === 0) {
            // Sem contexto: deixa o RLS negar (comportamento seguro por padrão).
            return query(args);
          }
          const results = await base.$transaction([...stmts, query(args)]);
          return results[results.length - 1];
        },
      },
    },
  });
}

export type PrismaRlsClient = ReturnType<typeof createPrismaClient>;
