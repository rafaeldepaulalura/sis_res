-- Complementos do cardápio (adicionais, ponto da carne, borda...).
-- As tabelas antigas eram por produto e nunca foram usadas (0 registros):
-- obrigavam recadastrar os mesmos adicionais em cada lanche. Substituídas
-- por grupos do estabelecimento, reaproveitados em vários produtos.
DROP TABLE IF EXISTS "ProductModifier";
DROP TABLE IF EXISTS "ProductModifierGroup";

CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductModifierGroup" (
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductModifierGroup_pkey" PRIMARY KEY ("productId","groupId")
);

CREATE INDEX "ModifierGroup_establishmentId_idx" ON "ModifierGroup"("establishmentId");
CREATE INDEX "ModifierOption_groupId_idx" ON "ModifierOption"("groupId");
CREATE INDEX "ProductModifierGroup_groupId_idx" ON "ProductModifierGroup"("groupId");

ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "ModifierGroup", "ModifierOption", "ProductModifierGroup" TO app_user;

-- RLS: grupo é escopado pelo estabelecimento. Opção e vínculo herdam pelo pai
-- (bypass ou existência do grupo/produto visível), no mesmo padrão das demais.
ALTER TABLE "ModifierGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModifierGroup" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ModifierGroup"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  );

ALTER TABLE "ModifierOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModifierOption" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ModifierOption"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g.id = "groupId")
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g.id = "groupId")
  );

ALTER TABLE "ProductModifierGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductModifierGroup" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProductModifierGroup"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g.id = "groupId")
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g.id = "groupId")
  );
