-- Permissões de sub-usuário (páginas + ações sensíveis).
-- Catálogo em backend/src/auth/permissions.ts.
ALTER TABLE "User" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: usuários que já existem mantêm o acesso que o papel deles dava,
-- para ninguém perder acesso ao aplicar esta migração. O dono do restaurante
-- pode customizar item a item depois, na tela de Configurações.
UPDATE "User" SET "permissions" = ARRAY[
  'mesas','balcao','comandas','cozinha','delivery','produtos','clientes',
  'financeiro','relatorios','configuracoes',
  'comanda.desconto','comanda.cancelar_item',
  'caixa.abrir_fechar','caixa.movimentacao'
] WHERE "role" IN ('ADMIN','MANAGER');

UPDATE "User" SET "permissions" = ARRAY[
  'mesas','balcao','comandas','delivery','clientes','financeiro',
  'comanda.desconto','comanda.cancelar_item',
  'caixa.abrir_fechar','caixa.movimentacao'
] WHERE "role" = 'CASHIER';

UPDATE "User" SET "permissions" = ARRAY['mesas','balcao','comandas','cozinha']
WHERE "role" = 'WAITER';

UPDATE "User" SET "permissions" = ARRAY['cozinha'] WHERE "role" = 'KITCHEN';

UPDATE "User" SET "permissions" = ARRAY['delivery'] WHERE "role" = 'COURIER';
