-- Taxa de entrega: padrão do estabelecimento + valor por bairro.
ALTER TABLE "Establishment" ADD COLUMN "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Establishment" ADD COLUMN "deliveryMinOrder" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Establishment" ADD COLUMN "deliveryFreeAbove" DECIMAL(10,2);

-- Taxa gravada na comanda: a tabela de bairros pode mudar depois sem
-- alterar o que já foi cobrado.
ALTER TABLE "Tab" ADD COLUMN "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryZone_establishmentId_neighborhood_key"
  ON "DeliveryZone"("establishmentId", "neighborhood");
CREATE INDEX "DeliveryZone_establishmentId_idx" ON "DeliveryZone"("establishmentId");

ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "DeliveryZone" TO app_user;

ALTER TABLE "DeliveryZone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryZone" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DeliveryZone"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  );
