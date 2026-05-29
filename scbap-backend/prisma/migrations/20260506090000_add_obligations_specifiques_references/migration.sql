CREATE TABLE "obligations_specifiques_references" (
    "id" TEXT NOT NULL,
    "dapg_id" INTEGER,
    "section" TEXT,
    "code" TEXT NOT NULL,
    "categorie_id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obligations_specifiques_references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "obligations_specifiques_references_code_key"
ON "obligations_specifiques_references"("code");

CREATE INDEX "obligations_specifiques_references_categorie_id_idx"
ON "obligations_specifiques_references"("categorie_id");

ALTER TABLE "obligations_specifiques_references"
ADD CONSTRAINT "obligations_specifiques_references_categorie_id_fkey"
FOREIGN KEY ("categorie_id") REFERENCES "categories_obligations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
