import type { Prisma } from "@prisma/client";
import type { DapgLiberationConditionnelle } from "./types";
import { normalizeJuridictionCode } from "../../utils/juridiction";

function parseDate(value?: string | null) {
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return parsed;
}

function normalizeTimeValue(value?: string | number | null) {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function mapDapgLiberationConditionnelleToDossierCreateInput(
  payload: DapgLiberationConditionnelle,
): Prisma.DossierUncheckedCreateInput {
  const rawPayload = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  const othersData = {
    source: "dapg",
    raw: rawPayload,
    typeAmenagementPeine: payload.type_amenagement_peine ?? null,
    dureePeineFermeMois: payload.duree_peine_ferme_mois ?? null,
    dureePeineTotaleMois: payload.duree_peine_totale_mois ?? null,
    peineAvecSursisMois: payload.peine_avec_sursis_mois ?? null,
    peinePurgeeMois: payload.peine_purgee_mois ?? null,
    dateEligibilite: payload.date_eligibilite ?? null,
    dateTempsEpreuve: payload.date_temps_epreuve ?? null,
    perpetuite: payload.perpetuite ?? null,
    recidiviste: payload.recidiviste ?? null,
    decisionCommission: payload.decision_commission ?? null,
    motifCommission: payload.motif_commission ?? null,
    motifDapg: payload.motif_dapg ?? null,
    arrete: payload.arrete ?? null,
    commissionAvis: payload.commission_avis ?? null,
    documentsJustificatifs: payload.documents_justificatifs ?? null,
    tousArretes: payload.tous_arretes ?? null,
    obligationsSpecifiques: payload.obligations_specifiques ?? null,
    prison: payload.prison ?? null,
    juridiction: payload.juridiction ?? null,
  } as Prisma.InputJsonValue;

  return {
    numeroDossier: payload.numero_dossier ?? "",
    juridictionId: normalizeJuridictionCode(
      payload.juridiction?.code ?? payload.juridiction?.name ?? payload.juridiction?.id,
    ) || undefined,
    prisonName: payload.prison?.name ?? undefined,
    nom: payload.nom ?? "",
    prenom: payload.prenom ?? "",
    dateNaissance: parseDate(payload.date_naissance),
    lieuNaissance: payload.lieu_naissance ?? undefined,
    nationalite: payload.nationalite ?? undefined,
    sexe: payload.sexe ?? undefined,
    profession: payload.profession ?? undefined,
    adresse: payload.adresse ?? undefined,
    telephoneContact: payload.telephone_contact ?? undefined,
    infractions: payload.infractions ?? undefined,
    numeroMandatDepot: payload.numero_mandat_depot ?? "",
    dateMandatDepot: parseDate(payload.date_mandat_depot),
    condamnation: payload.condamnation ?? undefined,
    dateFinPeine: parseDate(payload.date_fin_peine),
    dureePeineMois: payload.duree_peine_mois ?? undefined,
    decisionDapg: payload.decision_dapg ?? "acceptée",
    dateDecisionDapg: parseDate(payload.date_decision_dapg),
    dureeTempsEpreuve: normalizeTimeValue(payload.duree_temps_epreuve),
    obligations: payload.obligations ?? undefined,
    observations: payload.observations ?? payload.observations_commission ?? undefined,
    othersData,
    statut: "accepte_dapg",
  };
}
