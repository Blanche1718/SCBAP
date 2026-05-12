-- AlterTable
ALTER TABLE "rapports" ADD COLUMN     "titre" TEXT,
ADD COLUMN     "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
ADD COLUMN     "contenu" JSONB,
ADD COLUMN     "periode_du" DATE,
ADD COLUMN     "periode_au" DATE;
