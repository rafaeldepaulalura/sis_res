-- Marca e cota do estabelecimento
ALTER TABLE "Establishment" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Establishment" ADD COLUMN "primaryColor" VARCHAR(9) DEFAULT '#dc2626';
ALTER TABLE "Establishment" ADD COLUMN "fiscalDocumentQuota" INTEGER;
