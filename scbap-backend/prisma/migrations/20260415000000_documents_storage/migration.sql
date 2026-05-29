-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "type_document" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "external_url" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_object_key_key" ON "documents"("object_key");

-- CreateIndex
CREATE INDEX "documents_beneficiaire_id_created_at_idx" ON "documents"("beneficiaire_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
