export type Sexe = "M" | "F";

export type StatutDossier =
  | "ACTIF"
  | "REVOQUE"
  | "TERMINE";

export interface Beneficiaire {
  id: string;
  dossierId: string;
  statut: string;
  profilStatut?: "A_CONFIGURER" | "ACTIF" | "REVOQUE";
  biometrieEnrolementCode?: string | null;
  biometrieEnrolementStatut?: "AUCUN" | "EN_COURS" | "CONFIRME" | "ECHEC";
  biometrieEnrolementDeepLinkFamoco?: string | null;
  biometrieEnrolementApplication?: string | null;
  biometrieEnrolementMany?: string | null;
  biometrieEnrolementDemandeeLe?: string | null;
  biometrieEnrolementConfirmeeLe?: string | null;
  badgeNfc?: string | null;
  badgeNfcAssocieLe?: string | null;
  qrCode: string;
  profilConfirme?: boolean;
  profilConfirmeLe?: string | null;
  createdAt: string;
  dossier?: Dossier;
  zones?: Zone[];
  documents?: Document[];
  obligations?: Obligation[];
  pointages?: Pointage[];
  alertes?: Alerte[];
}

export interface Zone {
  id: string;
  beneficiaireId: string;
  nom: string;
  type: "AUTORISEE" | "INTERDITE";
  geometrie?: unknown;
  rayon?: number | null;
}

export interface Document {
  id: string;
  beneficiaireId: string;
  dossierId: string;
  typeDocument: string;
  titre: string;
  description?: string | null;
  source: string;
  statut: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  bucket: string;
  objectKey: string;
  externalUrl?: string | null;
  uploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
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
  obligationId?: string | null;
  agentId?: string | null;
  dateHeure: string;
  lieu?: string | null;
  nfc?: string | null;
  centreNom?: string | null;
  deviceId?: string | null;
  type: string;
  statut: string;
  source?: string;
  externalSuccess?: boolean | null;
  commentaire?: string | null;
  beneficiaire?: Beneficiaire;
  obligation?: Obligation;
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

export interface AlerteSurveillance {
  id: string;
  beneficiaireId: string;
  braceletId?: string | null;
  regleSurveillanceId?: string | null;
  positionGPSId?: string | null;
  type: string;
  niveau: string;
  message: string;
  source: string;
  statut: string;
  actionRecommandee?: string | null;
  declencheeLe: string;
  resolueLe?: string | null;
  beneficiaire?: Beneficiaire;
  bracelet?: {
    id: string;
    codeImei: string;
    identifiantPorteur?: string | null;
  } | null;
  positionGPS?: {
    id: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    zoneStatus?: string | null;
    dateHeure?: string | null;
  } | null;
  regleSurveillance?: {
    id: string;
    type: string;
    severite: string;
    description?: string | null;
  } | null;
}

export interface NotificationBeneficiaire {
  id: string;
  dossier?: {
    id: string;
    numeroDossier: string;
    nom: string;
    prenom: string;
    juridiction?: {
      id: string;
      nom: string;
    } | null;
  } | null;
}

export interface NotificationAlerte {
  id: string;
  type: string;
  niveau: string;
  message: string;
  statut: string;
  declencheeLe: string;
}

export interface NotificationPointage {
  id: string;
  dateHeure: string;
  lieu?: string | null;
  type: string;
  statut: string;
  commentaire?: string | null;
}

export interface Notification {
  id: string;
  userId?: string | null;
  beneficiaireId?: string | null;
  alerteId?: string | null;
  pointageId?: string | null;
  type: string;
  priorite: "CRITIQUE" | "NORMALE" | "INFO" | string;
  targetType: "ALERTE" | "BENEFICIAIRE" | "POINTAGE" | "SYSTEME" | string;
  targetId: string;
  canal: string;
  message: string;
  statut: string;
  lu: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  dateEnvoi?: string | null;
  beneficiaire?: NotificationBeneficiaire | null;
  alerte?: NotificationAlerte | null;
  pointage?: {
    id: string;
    dateHeure: string;
    lieu?: string | null;
    type: string;
    statut: string;
    commentaire?: string | null;
    beneficiaire?: NotificationBeneficiaire | null;
  } | null;
}



export interface Dossier {
  id: string;
  numeroDossier: string;
  juridictionId?: string | null;
  juridiction?: {
    id: string;
    nom: string;
  } | null;
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
  globalStats?: {
    valide: number;
    absent: number;
    en_retard: number;
    anomalie: number;
  };
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginationMeta;
}
