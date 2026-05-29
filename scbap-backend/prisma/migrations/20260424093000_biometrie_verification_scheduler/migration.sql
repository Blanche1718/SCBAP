ALTER TABLE "beneficiaires"
ADD COLUMN IF NOT EXISTS "biometrie_verification_essais" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "biometrie_derniere_verification_le" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "biometrie_prochaine_verification_le" TIMESTAMP(3);
