-- Imagens enviadas pelo usuário (logo do restaurante, logo do revendedor,
-- foto do produto) guardadas no próprio banco: o disco do container é
-- descartado a cada deploy e as fotos sumiriam.
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT,
    "resellerId" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Upload_establishmentId_idx" ON "Upload"("establishmentId");
CREATE INDEX "Upload_resellerId_idx" ON "Upload"("resellerId");

ALTER TABLE "Upload" ADD CONSTRAINT "Upload_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_resellerId_fkey"
  FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Upload" TO app_user;

-- RLS: cada tenant só enxerga os próprios arquivos. A rota que SERVE a
-- imagem roda com bypass, porque o cardápio é público e não tem sessão —
-- o id é um uuid e a imagem é pública por natureza (aparece no cardápio).
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Upload" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Upload"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
    OR "resellerId" = current_setting('app.current_reseller_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
    OR "resellerId" = current_setting('app.current_reseller_id', true)
  );
