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
  libelle?: string | null;
  code?: string | null;
  section?: string | null;
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

export type ServiceExterneType =
  | "MEDICAL"
  | "EMPLOI"
  | "FORMATION"
  | "SOCIAL"
  | "AUTRE";

export interface ServiceExterne {
  id: string;
  nom: string;
  type: ServiceExterneType;
  email: string;
  telephone?: string | null;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    affectationsTotal: number;
    affectationsActives: number;
    evaluationsTotal: number;
  };
}

export interface ServiceExterneAffectation {
  id: string;
  serviceId?: string | null;
  beneficiaireId: string;
  obligationId?: string | null;
  typeSuivi: string;
  libelleSuivi: string;
  codeSuivi: string;
  frequenceAttendue?: string | null;
  lieuAttendu?: string | null;
  horairesAttendus?: unknown;
  modalitesConnues: boolean;
  statut: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    nom: string;
    type: ServiceExterneType;
    email: string;
    telephone?: string | null;
    actif: boolean;
  } | null;
  beneficiaire: {
    id: string;
    statut: string;
    dossier?: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
    } | null;
  };
  obligation?: {
    id: string;
    type?: string | null;
    description?: string | null;
    frequence?: string | null;
    lieu?: string | null;
    heure?: string | null;
    categorie?: {
      id: string;
      nom: string;
    } | null;
  } | null;
  stats: {
    evaluationsTotal: number;
  };
}

export interface ServiceExterneDetail extends ServiceExterne {
  affectations: ServiceExterneAffectation[];
}

export interface ServiceExterneNotificationResult {
  mode: string;
  portailUrl: string;
  recipient: string;
  emailId: string | null;
}

export interface CreateServiceExterneResult {
  service: ServiceExterne;
  codeAccesInitial: string;
  notification: ServiceExterneNotificationResult;
}

export interface PortalSession {
  affectationId: string;
  serviceId: string;
  beneficiaireId: string;
  obligationId?: string | null;
  codeSuivi: string;
  typeSuivi: string;
  libelleSuivi: string;
  frequenceAttendue?: string | null;
  lieuAttendu?: string | null;
  modalitesConnues: boolean;
  statut: string;
  service: {
    id: string;
    nom: string;
    type: string;
    email: string;
    telephone?: string | null;
  };
  beneficiaire: {
    id: string;
    statut: string;
    dossier: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
    } | null;
  };
  obligation: {
    id: string;
    type?: string | null;
    description?: string | null;
    frequence?: string | null;
    lieu?: string | null;
    categorie?: {
      id: string;
      nom: string;
    } | null;
  } | null;
  periodeCourante: string;
}

export interface PortalAuthResponse {
  token: string;
  session: PortalSession;
}

export interface PortalRequestCodeResponse {
  status: "CODE_SENT";
  email: string;
}

export interface EvaluationOccurrence {
  id: string;
  dateSuivi: string;
  present: boolean;
}

export interface EvaluationAttachment {
  id: string;
  typeDocument: string;
  titre: string;
  description?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  uploadedAt?: string | null;
  createdAt: string;
  downloadUrl: string;
  portalDownloadUrl?: string;
}

export interface PortalEvaluation {
  id: string;
  affectationId: string;
  serviceId: string;
  beneficiaireId: string;
  obligationId?: string | null;
  periodeMois: string;
  frequenceSuivi: "QUOTIDIEN" | "HEBDOMADAIRE" | "MENSUEL";
  dateConstat: string;
  present: boolean;
  conformite: "SATISFAISANT" | "A_SURVEILLER" | "PREOCCUPANT";
  observations?: string | null;
  commentaire?: string | null;
  createdAt: string;
  updatedAt: string;
  occurrences: EvaluationOccurrence[];
  documents: EvaluationAttachment[];
  service?: {
    id: string;
    nom: string;
    type: string;
    email: string;
  };
  affectation?: {
    id: string;
    typeSuivi: string;
    libelleSuivi: string;
    codeSuivi: string;
  };
  beneficiaire?: {
    id: string;
    statut: string;
    dossier?: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
    } | null;
  };
  obligation?: {
    id: string;
    type?: string | null;
    description?: string | null;
    frequence?: string | null;
    lieu?: string | null;
    categorie?: {
      id: string;
      nom: string;
    } | null;
  } | null;
}

export interface RapportRedige {
  id: string;
  type: string;
  titre?: string | null;
  statut?: "BROUILLON" | "FINALISE" | string;
  contenu?: {
    version?: number;
    genereLe?: string;
    resume?: {
      beneficiaire?: string;
      dossier?: string | null;
      mandatDepot?: string | null;
      juridiction?: string | null;
      statut?: string;
      periodeDu?: string | null;
      periodeAu?: string | null;
      indicateurs?: Record<string, number>;
    };
    draft?: {
      obligations?: Array<{
        obligationId: string;
        categorie: string;
        libelle: string;
        statut: "RESPECTEE" | "NON_RESPECTEE" | string;
        commentaire?: string | null;
      }>;
      commentaireGeneral?: string | null;
    };
    sections?: Array<{
      titre: string;
      tone?: string;
      colonnes?: string[];
      lignes: Array<string | string[] | { type?: string; cellules?: string[] }>;
      texte?: string;
    }>;
  } | null;
  periodeDu?: string | null;
  periodeAu?: string | null;
  fichierUrl?: string | null;
  createdAt: string;
  beneficiaire: {
    id: string;
    statut: string;
    dossier?: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
    } | null;
  };
  generePar: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
}

export interface EvaluationRecue {
  id: string;
  affectationId: string;
  serviceId: string;
  beneficiaireId: string;
  obligationId?: string | null;
  periodeMois: string;
  frequenceSuivi: "QUOTIDIEN" | "HEBDOMADAIRE" | "MENSUEL";
  dateConstat: string;
  present: boolean;
  conformite: "SATISFAISANT" | "A_SURVEILLER" | "PREOCCUPANT";
  observations?: string | null;
  commentaire?: string | null;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    nom: string;
    type: string;
    email: string;
  };
  affectation: {
    id: string;
    typeSuivi: string;
    libelleSuivi: string;
    codeSuivi: string;
  };
  beneficiaire: {
    id: string;
    statut: string;
    dossier?: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
    } | null;
  };
  obligation?: {
    id: string;
    type?: string | null;
    description?: string | null;
    frequence?: string | null;
    lieu?: string | null;
    categorie?: {
      id: string;
      nom: string;
    } | null;
  } | null;
  occurrences: EvaluationOccurrence[];
  documents: EvaluationAttachment[];
}

export interface DocumentRecu {
  id: string;
  source: string;
  origin: "SCBAP" | "DAPG" | string;
  typeDocument: string;
  titre: string;
  description?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  statut: string;
  uploadedAt?: string | null;
  createdAt: string;
  previewUrl?: string;
  downloadUrl?: string;
  beneficiaire: {
    id: string;
    statut: string;
    dossier?: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
    } | null;
  };
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
