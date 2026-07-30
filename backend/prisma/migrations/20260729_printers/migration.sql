-- Impressão por setor: cada área (cozinha, copa, chapa) tem sua impressora
-- térmica de rede, e a categoria do produto decide para onde o item vai.
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTING', 'DONE', 'FAILED');
CREATE TYPE "PrintJobKind" AS ENUM ('KITCHEN', 'TEST');

CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "columns" INTEGER NOT NULL DEFAULT 48,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "kind" "PrintJobKind" NOT NULL DEFAULT 'KITCHEN',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "printedAt" TIMESTAMP(3),
    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- Categoria aponta para a impressora do setor. NULL = não imprime (só tela).
ALTER TABLE "Category" ADD COLUMN "printerId" TEXT;

CREATE INDEX "Printer_establishmentId_idx" ON "Printer"("establishmentId");
CREATE INDEX "PrintJob_establishmentId_idx" ON "PrintJob"("establishmentId");
CREATE INDEX "PrintJob_status_idx" ON "PrintJob"("status");

ALTER TABLE "Printer" ADD CONSTRAINT "Printer_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_printerId_fkey"
  FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_printerId_fkey"
  FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Printer", "PrintJob" TO app_user;

ALTER TABLE "Printer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Printer" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Printer"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  );

ALTER TABLE "PrintJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrintJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PrintJob"
  USING (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  )
  WITH CHECK (
    coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
    OR "establishmentId" = current_setting('app.current_establishment_id', true)
  );
