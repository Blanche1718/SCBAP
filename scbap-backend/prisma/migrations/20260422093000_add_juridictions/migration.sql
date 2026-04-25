-- Create juridictions reference table
CREATE TABLE "juridictions" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "juridictions_pkey" PRIMARY KEY ("id")
);

-- Seed the jurisdictions used by the current SCBAP flow
INSERT INTO "juridictions" ("id", "nom")
VALUES
    ('COTONOU', 'Cotonou'),
    ('PORTO_NOVO', 'Porto-Novo'),
    ('PARAKOU', 'Parakou'),
    ('ABOMEY', 'Abomey'),
    ('NATITINGOU', 'Natitingou')
ON CONFLICT ("id") DO NOTHING;

-- Backfill legacy dossier jurisdiction ids to the new normalized codes
UPDATE "dossiers" SET "juridiction_id" = 'COTONOU' WHERE "juridiction_id" IN ('1', 'Cotonou', 'COTONOU');
UPDATE "dossiers" SET "juridiction_id" = 'PORTO_NOVO' WHERE "juridiction_id" IN ('2', 'Porto-Novo', 'Porto_Novo', 'PORTO_NOVO');
UPDATE "dossiers" SET "juridiction_id" = 'PARAKOU' WHERE "juridiction_id" IN ('3', 'Parakou', 'PARAKOU');
UPDATE "dossiers" SET "juridiction_id" = 'ABOMEY' WHERE "juridiction_id" IN ('4', 'Abomey', 'ABOMEY');
UPDATE "dossiers" SET "juridiction_id" = 'NATITINGOU' WHERE "juridiction_id" IN ('5', 'Natitingou', 'NATITINGOU');

-- Link dossiers to juridictions
ALTER TABLE "dossiers"
ADD CONSTRAINT "dossiers_juridiction_id_fkey"
FOREIGN KEY ("juridiction_id") REFERENCES "juridictions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
