ALTER TABLE "beneficiaires"
ADD COLUMN IF NOT EXISTS "badge_nfc" TEXT,
ADD COLUMN IF NOT EXISTS "badge_nfc_associe_le" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "beneficiaires_badge_nfc_key"
ON "beneficiaires" ("badge_nfc");

ALTER TABLE "pointages"
ALTER COLUMN "obligation_id" DROP NOT NULL,
ALTER COLUMN "agent_id" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "nfc" TEXT,
ADD COLUMN IF NOT EXISTS "centre_nom" TEXT,
ADD COLUMN IF NOT EXISTS "device_id" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'SYSTEME',
ADD COLUMN IF NOT EXISTS "external_success" BOOLEAN,
ADD COLUMN IF NOT EXISTS "external_payload" JSONB;
