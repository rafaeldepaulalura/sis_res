-- Pizza meia a meia
-- Categoria de pizza: habilita a montagem de item com 2 sabores.
ALTER TABLE "Category" ADD COLUMN "allowsHalf" BOOLEAN NOT NULL DEFAULT false;

-- 2º sabor do item. unitPrice do item passa a ser o MAIOR preço entre os
-- dois sabores (praxe das pizzarias no Brasil).
ALTER TABLE "TabItem" ADD COLUMN "halfProductId" TEXT;

ALTER TABLE "TabItem" ADD CONSTRAINT "TabItem_halfProductId_fkey"
  FOREIGN KEY ("halfProductId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "TabItem_halfProductId_idx" ON "TabItem"("halfProductId");
