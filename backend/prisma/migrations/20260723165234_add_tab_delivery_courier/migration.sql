-- AlterTable
ALTER TABLE "Tab" ADD COLUMN     "isDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "courierId" TEXT;

-- CreateIndex
CREATE INDEX "Tab_courierId_idx" ON "Tab"("courierId");

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
