export interface DapgPrison {
  id?: number | string | null;
  name?: string | null;
  acronym?: string | null;
}

export interface DapgJuridiction {
  id?: number | string | null;
  code?: string | null;
  name?: string | null;
}

export interface DapgArreteSignataire {
  id?: number | string | null;
  nom?: string | null;
  prenom?: string | null;
}

export interface DapgArrete {
  id?: number | string | null;
  numero_arrete?: string | null;
  type_document?: string | null;
  date_arrete?: string | null;
  date_signature?: string | null;
  statut?: string | null;
  signe_par?: DapgArreteSignataire | null;
}

export interface DapgCommissionAvis {
  id?: number | string | null;
  avis?: string | null;
  commentaire?: string | null;
  commission?: string | null;
  created_at?: string | null;
}

export interface DapgObligationSpecifique {
  id?: number | string | null;
  section?: string | null;
  code?: string | number | null;
  categorie?: string | null;
  libelle?: string | null;
}

export interface DapgLiberationConditionnelle {
  id?: number | string | null;
  numero_dossier?: string | null;
  type_amenagement_peine?: string | null;
  statut?: string | null;
  nom?: string | null;
  prenom?: string | null;
  nom_complet?: string | null;
  date_naissance?: string | null;
  lieu_naissance?: string | null;
  nationalite?: string | null;
  sexe?: "M" | "F" | null;
  profession?: string | null;
  adresse?: string | null;
  telephone_contact?: string | null;
  numero_mandat_depot?: string | null;
  date_mandat_depot?: string | null;
  condamnation?: string | null;
  infractions?: string | null;
  date_condamnation?: string | null;
  duree_peine_mois?: number | null;
  duree_peine_ferme_mois?: number | null;
  duree_peine_totale_mois?: number | null;
  peine_avec_sursis_mois?: number | null;
  peine_purgee_mois?: number | null;
  date_fin_peine?: string | null;
  perpetuite?: boolean | null;
  recidiviste?: boolean | null;
  date_eligibilite?: string | null;
  duree_temps_epreuve?: string | number | null;
  date_temps_epreuve?: string | null;
  prison?: DapgPrison | null;
  juridiction?: DapgJuridiction | null;
  decision_commission?: string | null;
  observations_commission?: string | null;
  decision_dapg?: string | null;
  date_decision_dapg?: string | null;
  arrete?: DapgArrete | null;
  obligations_specifiques?: unknown[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  obligations?: string | null;
  observations?: string | null;
  motif_commission?: string | null;
  motif_dapg?: string | null;
  commission_avis?: DapgCommissionAvis[] | null;
  documents_justificatifs?: unknown[] | null;
  tous_arretes?: DapgArrete[] | null;
}
