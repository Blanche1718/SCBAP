ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "pointage_id" TEXT,
ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'SYSTEME',
ADD COLUMN IF NOT EXISTS "priorite" TEXT NOT NULL DEFAULT 'INFO',
ADD COLUMN IF NOT EXISTS "target_type" TEXT NOT NULL DEFAULT 'SYSTEME',
ADD COLUMN IF NOT EXISTS "target_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "notifications"
ALTER COLUMN "canal" SET DEFAULT 'INTERFACE',
ALTER COLUMN "message" SET DEFAULT '',
ALTER COLUMN "statut" SET DEFAULT 'ENVOYE';

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_pointage_id_fkey"
FOREIGN KEY ("pointage_id") REFERENCES "pointages"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "notifications_lu_created_at_idx"
ON "notifications" ("lu", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "notifications_target_type_target_id_idx"
ON "notifications" ("target_type", "target_id");
