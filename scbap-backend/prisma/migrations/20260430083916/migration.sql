/*
  Warnings:

  - You are about to drop the column `batterie` on the `positions_gps` table. All the data in the column will be lost.
  - You are about to drop the column `precision` on the `positions_gps` table. All the data in the column will be lost.
  - You are about to alter the column `precision_m` on the `positions_gps` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- DropForeignKey
ALTER TABLE "pointages" DROP CONSTRAINT "pointages_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "pointages" DROP CONSTRAINT "pointages_obligation_id_fkey";

-- DropIndex
DROP INDEX "notifications_lu_created_at_idx";

-- AlterTable
ALTER TABLE "alertes_surveillance" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "canal" DROP DEFAULT,
ALTER COLUMN "message" DROP DEFAULT,
ALTER COLUMN "statut" DROP DEFAULT,
ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "priorite" DROP DEFAULT,
ALTER COLUMN "target_type" DROP DEFAULT,
ALTER COLUMN "target_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "positions_gps" DROP COLUMN "batterie",
DROP COLUMN "precision",
ALTER COLUMN "precision_m" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "regles_surveillance" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "notifications_lu_created_at_idx" ON "notifications"("lu", "created_at");

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
