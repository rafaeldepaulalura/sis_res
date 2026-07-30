-- Juntar mesas: a comanda absorvida aponta para a que ficou com os itens.
-- Não é venda nem cancelamento — por isso um campo próprio, para o relatório
-- poder dizer "juntada com a Mesa X" em vez de mostrar conta vazia.
ALTER TABLE "Tab" ADD COLUMN "mergedIntoId" TEXT;

ALTER TABLE "Tab" ADD CONSTRAINT "Tab_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "Tab"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Tab_mergedIntoId_idx" ON "Tab"("mergedIntoId");
