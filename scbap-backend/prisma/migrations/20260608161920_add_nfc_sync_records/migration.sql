-- CreateTable
CREATE TABLE "nfc_sync_records" (
    "id" TEXT NOT NULL,
    "numero_mandat" TEXT NOT NULL,
    "nfc" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "beneficiaire_id" TEXT,
    "beneficiaire_nom" TEXT,
    "beneficiaire_prenom" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfc_sync_records_pkey" PRIMARY KEY ("id")
);
