ALTER TABLE "beneficiaires"
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_code" TEXT,
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_statut" TEXT NOT NULL DEFAULT 'AUCUN',
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_deep_link_famoco" TEXT,
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_application" TEXT,
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_many" TEXT,
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_demandee_le" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "biometrie_enrolement_confirmee_le" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "beneficiaires_biometrie_enrolement_code_key"
ON "beneficiaires" ("biometrie_enrolement_code");
