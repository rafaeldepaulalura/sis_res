-- Autorização por PIN do gerente em ações sensíveis.
ALTER TABLE "Establishment" ADD COLUMN "requirePinForDiscount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Establishment" ADD COLUMN "requirePinForCancelItem" BOOLEAN NOT NULL DEFAULT false;

-- Quem autorizou o quê: é o registro que o dono cobra quando some item
-- da conta ou aparece desconto que ninguém explica.
ALTER TABLE "TabItem" ADD COLUMN "cancelledById" TEXT;
ALTER TABLE "TabItem" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "discountById" TEXT;

ALTER TABLE "TabItem" ADD CONSTRAINT "TabItem_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountById_fkey"
  FOREIGN KEY ("discountById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TabItem_cancelledById_idx" ON "TabItem"("cancelledById");
CREATE INDEX "Order_discountById_idx" ON "Order"("discountById");
