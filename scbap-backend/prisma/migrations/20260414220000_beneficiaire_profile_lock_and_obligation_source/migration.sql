-- AlterTable
ALTER TABLE "beneficiaires"
ADD COLUMN     "profil_confirme" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profil_confirme_le" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "obligations"
ADD COLUMN     "source" TEXT;
