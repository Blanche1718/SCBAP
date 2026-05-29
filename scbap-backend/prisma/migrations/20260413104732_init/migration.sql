-- CreateTable
CREATE TABLE "structures" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "juridiction" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "mot_de_passe" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers" (
    "id" TEXT NOT NULL,
    "numero_dossier" TEXT NOT NULL,
    "juridiction_id" TEXT,
    "prison_id" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "date_naissance" DATE,
    "lieu_naissance" TEXT,
    "nationalite" TEXT,
    "sexe" TEXT,
    "profession" TEXT,
    "adresse" TEXT,
    "telephone_contact" TEXT,
    "infractions" TEXT,
    "numero_mandat_depot" TEXT NOT NULL,
    "date_mandat_depot" DATE,
    "condamnation" TEXT,
    "date_fin_peine" DATE,
    "duree_peine_mois" INTEGER,
    "obligations" TEXT,
    "observations" TEXT,
    "others_data" JSONB,
    "statut" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaires" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories_obligations" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obligations" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "categorie_id" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "frequence" TEXT,
    "jour_semaine" TEXT,
    "heure" TIME,
    "lieu" TEXT,
    "metadata" JSONB,
    "statut_structuration" TEXT,
    "date_debut" DATE,
    "date_fin" DATE,
    "statut" TEXT,
    "raison_modification" TEXT,
    "raison_autre" TEXT,
    "modifie_le" TIMESTAMP(3),
    "modifie_par" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pointages" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "obligation_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "date_heure" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "pointages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_autorisation" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "motif" TEXT,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL,
    "traitee_par" TEXT,
    "date_traitement" TIMESTAMP(3),
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demandes_autorisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justificatifs" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fichier_url" TEXT,
    "statut" TEXT NOT NULL,
    "valide_par" TEXT,
    "date_validation" TIMESTAMP(3),
    "commentaire" TEXT,

    CONSTRAINT "justificatifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "beneficiaire_id" TEXT,
    "alerte_id" TEXT,
    "canal" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "date_envoi" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "genere_par" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fichier_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracelets" (
    "id" TEXT NOT NULL,
    "code_imei" TEXT NOT NULL,
    "identifiant_porteur" TEXT,
    "numero_sim" TEXT,
    "modele" TEXT,
    "fabricant" TEXT,
    "statut" TEXT NOT NULL,
    "date_activation" TIMESTAMP(3),

    CONSTRAINT "bracelets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations_bracelets" (
    "id" TEXT NOT NULL,
    "bracelet_id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),

    CONSTRAINT "affectations_bracelets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions_gps" (
    "id" TEXT NOT NULL,
    "bracelet_id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "precision" DECIMAL(65,30),
    "presence_flag" BOOLEAN,
    "rssi_dbm" INTEGER,
    "batterie" INTEGER,
    "power_source" TEXT,
    "strap_status" INTEGER,
    "case_tamper" BOOLEAN,
    "geofence_breach" BOOLEAN,
    "power_loss" BOOLEAN,
    "statut_bracelet" TEXT,
    "heartbeat" BOOLEAN,
    "date_heure" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_gps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "geometrie" JSONB,
    "rayon" INTEGER,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regles_horaires" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "obligation_id" TEXT NOT NULL,
    "jour_semaine" TEXT NOT NULL,
    "heure_debut" TIME NOT NULL,
    "heure_fin" TIME NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "regles_horaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents_bracelet" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "bracelet_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date_heure" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL,

    CONSTRAINT "incidents_bracelet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_actions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entite_id" TEXT NOT NULL,
    "description" TEXT,
    "ancienne_valeur" JSONB,
    "nouvelle_valeur" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_statuts" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "ancien_statut" TEXT NOT NULL,
    "nouveau_statut" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_statuts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "structures_code_key" ON "structures"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_numero_dossier_key" ON "dossiers"("numero_dossier");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaires_dossier_id_key" ON "beneficiaires"("dossier_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaires_qr_code_key" ON "beneficiaires"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "bracelets_code_imei_key" ON "bracelets"("code_imei");

-- CreateIndex
CREATE INDEX "positions_gps_bracelet_id_date_heure_idx" ON "positions_gps"("bracelet_id", "date_heure" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaires" ADD CONSTRAINT "beneficiaires_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_modifie_par_fkey" FOREIGN KEY ("modifie_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_autorisation" ADD CONSTRAINT "demandes_autorisation_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_autorisation" ADD CONSTRAINT "demandes_autorisation_traitee_par_fkey" FOREIGN KEY ("traitee_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificatifs" ADD CONSTRAINT "justificatifs_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificatifs" ADD CONSTRAINT "justificatifs_valide_par_fkey" FOREIGN KEY ("valide_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alerte_id_fkey" FOREIGN KEY ("alerte_id") REFERENCES "alertes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_genere_par_fkey" FOREIGN KEY ("genere_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_bracelets" ADD CONSTRAINT "affectations_bracelets_bracelet_id_fkey" FOREIGN KEY ("bracelet_id") REFERENCES "bracelets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_bracelets" ADD CONSTRAINT "affectations_bracelets_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions_gps" ADD CONSTRAINT "positions_gps_bracelet_id_fkey" FOREIGN KEY ("bracelet_id") REFERENCES "bracelets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions_gps" ADD CONSTRAINT "positions_gps_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regles_horaires" ADD CONSTRAINT "regles_horaires_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regles_horaires" ADD CONSTRAINT "regles_horaires_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents_bracelet" ADD CONSTRAINT "incidents_bracelet_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents_bracelet" ADD CONSTRAINT "incidents_bracelet_bracelet_id_fkey" FOREIGN KEY ("bracelet_id") REFERENCES "bracelets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_actions" ADD CONSTRAINT "historique_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "beneficiaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
