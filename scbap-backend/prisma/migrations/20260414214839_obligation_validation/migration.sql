-- AlterTable
ALTER TABLE "dossiers" ADD COLUMN     "date_decision_dapg" TIMESTAMP(3),
ADD COLUMN     "decision_dapg" TEXT,
ADD COLUMN     "duree_temps_epreuve" TEXT;
