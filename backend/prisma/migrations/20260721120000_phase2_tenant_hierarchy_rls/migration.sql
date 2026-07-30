-- ============================================================================
-- Fase 2 · Bloco 1 — Hierarquia de tenant + Row-Level Security (RLS)
-- ============================================================================

-- ----- Schema (gerado via prisma migrate diff) -----

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'RESELLER_ADMIN';

-- DropIndex
DROP INDEX "User_establishmentId_email_key";

-- AlterTable
ALTER TABLE "Establishment" ADD COLUMN     "resellerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resellerId" TEXT,
ALTER COLUMN "establishmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Reseller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#dc2626',
    "subdomain" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reseller_subdomain_key" ON "Reseller"("subdomain");
CREATE UNIQUE INDEX "Reseller_cnpj_key" ON "Reseller"("cnpj");
CREATE INDEX "Establishment_resellerId_idx" ON "Establishment"("resellerId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_resellerId_idx" ON "User"("resellerId");

-- AddForeignKey
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----- Role de aplicação sem superuser (subject to RLS) -----

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_pw';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE restaurante_saas TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- Tabelas/sequências criadas nos próximos blocos herdam os privilégios:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- ----- RLS: isolamento por establishment_id -----
-- Policy: permite quando o bypass está ligado (Super Admin / auth / rotas
-- públicas) OU quando a linha pertence ao establishment do contexto atual.
-- current_setting(...,true) => NULL quando não setado => nega por padrão.

-- Tabelas com coluna establishmentId:
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'User','Category','Product','RoomArea','Table','Tab',
    'CashRegisterSession','Order','Customer','Courier','FiscalCredential'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (
        coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
        OR "establishmentId" = current_setting('app.current_establishment_id', true)
      )
      WITH CHECK (
        coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
        OR "establishmentId" = current_setting('app.current_establishment_id', true)
      );
    $f$, t);
  END LOOP;
END
$$;

-- Establishment: escopo pelo próprio id (contexto de establishment) ou pelo
-- reseller (contexto de revendedor).
ALTER TABLE "Establishment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Establishment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Establishment"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "id" = current_setting('app.current_establishment_id', true)
    OR "resellerId" = current_setting('app.current_reseller_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "id" = current_setting('app.current_establishment_id', true)
    OR "resellerId" = current_setting('app.current_reseller_id', true)
  );

-- Reseller: escopo pelo próprio id (contexto de revendedor) ou bypass (Super Admin).
ALTER TABLE "Reseller" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reseller" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Reseller"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "id" = current_setting('app.current_reseller_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "id" = current_setting('app.current_reseller_id', true)
  );
