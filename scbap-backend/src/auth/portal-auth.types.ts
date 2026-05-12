export type PortalJwtPayload = {
  sub: string;
  type: "portail";
  affectationId: string;
  serviceId: string;
  beneficiaireId: string;
  obligationId?: string | null;
};

export type PortalAuthenticatedSession = {
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
      juridictionId: string;
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
};
