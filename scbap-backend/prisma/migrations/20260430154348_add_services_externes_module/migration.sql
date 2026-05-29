-- CreateTable
CREATE TABLE "services_externes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "code_acces_hash" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_externes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations_services_externes" (
    "id" TEXT NOT NULL,
    "service_id" TEXT,
    "beneficiaire_id" TEXT NOT NULL,
    "obligation_id" TEXT,
    "type_suivi" TEXT NOT NULL,
    "libelle_suivi" TEXT NOT NULL,
    "code_suivi" TEXT NOT NULL,
    "frequence_attendue" TEXT,
    "lieu_attendu" TEXT,
    "horaires_attendus" JSONB,
    "modalites_connues" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affectations_services_externes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations_services_externes" (
    "id" TEXT NOT NULL,
    "affectation_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "obligation_id" TEXT,
    "periode_mois" DATE NOT NULL,
    "date_constat" DATE NOT NULL,
    "present" BOOLEAN NOT NULL,
    "conformite" TEXT NOT NULL,
    "observations" TEXT,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_services_externes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_externes_email_key" ON "services_externes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "affectations_services_externes_code_suivi_key" ON "affectations_services_externes"("code_suivi");

-- CreateIndex
CREATE INDEX "affectations_services_externes_service_id_actif_idx" ON "affectations_services_externes"("service_id", "actif");

-- CreateIndex
CREATE INDEX "affectations_services_externes_beneficiaire_id_actif_idx" ON "affectations_services_externes"("beneficiaire_id", "actif");

-- CreateIndex
CREATE INDEX "affectations_services_externes_obligation_id_idx" ON "affectations_services_externes"("obligation_id");

-- CreateIndex
CREATE INDEX "evaluations_services_externes_beneficiaire_id_periode_mois_idx" ON "evaluations_services_externes"("beneficiaire_id", "periode_mois" DESC);

-- CreateIndex
CREATE INDEX "evaluations_services_externes_service_id_periode_mois_idx" ON "evaluations_services_externes"("service_id", "periode_mois" DESC);

-- CreateIndex
CREATE INDEX "evaluations_services_externes_obligation_id_idx" ON "evaluations_services_externes"("obligation_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_services_externes_affectation_id_periode_mois_key" ON "evaluations_services_externes"("affectation_id", "periode_mois");

-- AddForeignKey
ALTER TABLE "affectations_services_externes" ADD CONSTRAINT "affectations_services_externes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services_externes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_services_externes" ADD CONSTRAINT "affectations_services_externes_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_services_externes" ADD CONSTRAINT "affectations_services_externes_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_services_externes" ADD CONSTRAINT "evaluations_services_externes_affectation_id_fkey" FOREIGN KEY ("affectation_id") REFERENCES "affectations_services_externes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_services_externes" ADD CONSTRAINT "evaluations_services_externes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services_externes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_services_externes" ADD CONSTRAINT "evaluations_services_externes_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_services_externes" ADD CONSTRAINT "evaluations_services_externes_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
