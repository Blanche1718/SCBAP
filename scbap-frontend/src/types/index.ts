export type Sexe = "M" | "F";

export type StatutDossier =
  | "ACTIF"
  | "REVOQUE"
  | "TERMINE";

export interface Beneficiaire {
  id: string;
  dossierId: string;
  statut: string;
  qrCode: string;
  profilConfirme?: boolean;
  profilConfirmeLe?: string | null;
  createdAt: string;
  dossier?: Dossier;
  obligations?: Obligation[];
  pointages?: Pointage[];
  alertes?: Alerte[];
}

export interface Obligation {
  id: string;
  beneficiaireId: string;
  dossierId: string;
  categorieId: string;
  source?: string | null;
  description: string;
  type?: string | null;
  frequence?: string | null;
  jourSemaine?: string | null;
  heure?: string | null;
  lieu?: string | null;
  metadata?: Record<string, unknown> | null;
  statutStructuration?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  statut?: string | null;
  raisonModification?: string | null;
  raisonAutre?: string | null;
  modifieLe?: string | null;
  modifiePar?: string | null;
  createdAt?: string | null;
  categorie?: {
    id: string;
    nom: string;
    description?: string | null;
  } | null;
}

export interface Pointage {
  id: string;
  beneficiaireId: string;
  obligationId: string;
  agentId: string;
  dateHeure: string;
  lieu?: string | null;
  type: string;
  statut: string;
  commentaire?: string | null;
}

export interface Alerte {
  id: string;
  beneficiaireId: string;
  type: string;
  niveau: string;
  message: string;
  source: string;
  statut: string;
  createdAt: string;
}



export interface Dossier {
  id: string;
  numeroDossier: string;
  juridictionId?: number | null;
  prisonId?: number | null;
  prisonName?: string | null;
  nom: string;
  prenom: string;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  nationalite?: string | null;
  sexe?: Sexe | null;
  profession?: string | null;
  adresse?: string | null;
  telephoneContact?: string | null;
  infractions?: string | null;
  numeroMandatDepot: string;
  dateMandatDepot?: string | null;
  condamnation?: string | null;
  dateFinPeine?: string | null;
  dureePeineMois?: number | null;
  decisionDapg?: string | null;
  dateDecisionDapg?: string | null;
  dureeTempsEpreuve?: string | null;
  observations?: string | null;
  obligations?: string | null;
  othersData?: Record<string, unknown> | null;
  statut?: StatutDossier;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  beneficiaire?: Beneficiaire;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginationMeta;
}
