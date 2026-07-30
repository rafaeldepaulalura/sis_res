-- ============================================================================
-- Fase 2 · Bloco 2 — Plan + ResellerSubscription (Super Admin)
-- ============================================================================

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "includedFiscalDocuments" INTEGER NOT NULL DEFAULT 0,
    "overageBlocked" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerSubscription" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "gatewaySubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResellerSubscription_resellerId_idx" ON "ResellerSubscription"("resellerId");
CREATE INDEX "ResellerSubscription_planId_idx" ON "ResellerSubscription"("planId");

-- AddForeignKey
ALTER TABLE "ResellerSubscription" ADD CONSTRAINT "ResellerSubscription_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResellerSubscription" ADD CONSTRAINT "ResellerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Privilégios (ALTER DEFAULT PRIVILEGES da Fase 2 já cobre, reforçamos aqui):
GRANT SELECT, INSERT, UPDATE, DELETE ON "Plan", "ResellerSubscription" TO app_user;

-- RLS: ResellerSubscription é escopada pelo revendedor. Plan é catálogo global
-- (sem RLS) — legível por Super Admin e Revendedor.
ALTER TABLE "ResellerSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResellerSubscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ResellerSubscription"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "resellerId" = current_setting('app.current_reseller_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "resellerId" = current_setting('app.current_reseller_id', true)
  );
