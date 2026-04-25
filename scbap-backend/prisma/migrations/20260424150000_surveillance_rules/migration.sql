CREATE TABLE IF NOT EXISTS "regles_surveillance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "beneficiaire_id" TEXT,
  "bracelet_id" TEXT,
  "type" TEXT NOT NULL,
  "seuil" DOUBLE PRECISION,
  "unite" TEXT,
  "severite" TEXT NOT NULL,
  "actif" BOOLEAN NOT NULL DEFAULT TRUE,
  "parametres" JSONB,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "regles_surveillance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "alertes_surveillance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "beneficiaire_id" TEXT NOT NULL,
  "bracelet_id" TEXT,
  "regle_surveillance_id" TEXT,
  "position_gps_id" TEXT,
  "type" TEXT NOT NULL,
  "niveau" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "statut" TEXT NOT NULL,
  "action_recommandee" TEXT,
  "metadata" JSONB,
  "declenchee_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolue_le" TIMESTAMP(3),

  CONSTRAINT "alertes_surveillance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "regles_surveillance_beneficiaire_id_actif_idx"
  ON "regles_surveillance" ("beneficiaire_id", "actif");

CREATE INDEX IF NOT EXISTS "regles_surveillance_bracelet_id_actif_idx"
  ON "regles_surveillance" ("bracelet_id", "actif");

CREATE INDEX IF NOT EXISTS "alertes_surveillance_beneficiaire_id_declenchee_le_idx"
  ON "alertes_surveillance" ("beneficiaire_id", "declenchee_le" DESC);

CREATE INDEX IF NOT EXISTS "alertes_surveillance_statut_niveau_idx"
  ON "alertes_surveillance" ("statut", "niveau");

ALTER TABLE "regles_surveillance"
  ADD CONSTRAINT "regles_surveillance_beneficiaire_id_fkey"
  FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "regles_surveillance"
  ADD CONSTRAINT "regles_surveillance_bracelet_id_fkey"
  FOREIGN KEY ("bracelet_id") REFERENCES "bracelets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alertes_surveillance"
  ADD CONSTRAINT "alertes_surveillance_beneficiaire_id_fkey"
  FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alertes_surveillance"
  ADD CONSTRAINT "alertes_surveillance_bracelet_id_fkey"
  FOREIGN KEY ("bracelet_id") REFERENCES "bracelets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alertes_surveillance"
  ADD CONSTRAINT "alertes_surveillance_regle_surveillance_id_fkey"
  FOREIGN KEY ("regle_surveillance_id") REFERENCES "regles_surveillance"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alertes_surveillance"
  ADD CONSTRAINT "alertes_surveillance_position_gps_id_fkey"
  FOREIGN KEY ("position_gps_id") REFERENCES "positions_gps"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
