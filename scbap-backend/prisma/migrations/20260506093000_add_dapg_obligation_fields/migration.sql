ALTER TABLE "obligations"
ADD COLUMN "obligation_specifique_reference_id" TEXT,
ADD COLUMN "code" TEXT,
ADD COLUMN "section" TEXT,
ADD COLUMN "libelle" TEXT;

UPDATE "obligations"
SET
  "code" = COALESCE("code", "metadata"->>'code'),
  "section" = COALESCE("section", "metadata"->>'section'),
  "libelle" = COALESCE("libelle", "metadata"->>'libelle'),
  "obligation_specifique_reference_id" = (
    SELECT "id"
    FROM "obligations_specifiques_references"
    WHERE "id" = NULLIF("obligations"."metadata"->>'referenceId', '')
    LIMIT 1
  )
WHERE "metadata" IS NOT NULL
  AND "obligation_specifique_reference_id" IS NULL;

CREATE INDEX "obligations_obligation_specifique_reference_id_idx"
ON "obligations"("obligation_specifique_reference_id");

CREATE INDEX "obligations_code_idx"
ON "obligations"("code");

ALTER TABLE "obligations"
ADD CONSTRAINT "obligations_obligation_specifique_reference_id_fkey"
FOREIGN KEY ("obligation_specifique_reference_id")
REFERENCES "obligations_specifiques_references"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
