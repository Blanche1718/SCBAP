-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "evaluation_service_externe_id" TEXT;

-- AlterTable
ALTER TABLE "evaluations_services_externes" ADD COLUMN     "frequence_suivi" TEXT NOT NULL DEFAULT 'MENSUEL';

-- CreateTable
CREATE TABLE "evaluations_services_externes_occurrences" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "date_suivi" DATE NOT NULL,
    "present" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_services_externes_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluations_services_externes_occurrences_date_suivi_idx" ON "evaluations_services_externes_occurrences"("date_suivi");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_services_externes_occurrences_evaluation_id_dat_key" ON "evaluations_services_externes_occurrences"("evaluation_id", "date_suivi");

-- CreateIndex
CREATE INDEX "documents_evaluation_service_externe_id_idx" ON "documents"("evaluation_service_externe_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_evaluation_service_externe_id_fkey" FOREIGN KEY ("evaluation_service_externe_id") REFERENCES "evaluations_services_externes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_services_externes_occurrences" ADD CONSTRAINT "evaluations_services_externes_occurrences_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations_services_externes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
