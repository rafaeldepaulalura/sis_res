-- Endereço de entrega vinculado à comanda (delivery criado direto no PDV)
ALTER TABLE "Tab" ADD COLUMN "deliveryAddressId" TEXT;

ALTER TABLE "Tab" ADD CONSTRAINT "Tab_deliveryAddressId_fkey"
  FOREIGN KEY ("deliveryAddressId") REFERENCES "CustomerAddress"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Tab_deliveryAddressId_idx" ON "Tab"("deliveryAddressId");
