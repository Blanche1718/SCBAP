import type { Prisma } from "@prisma/client";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import type { AuthenticatedUser } from "../auth/auth.types";
import { getUserJuridictionCode } from "../utils/juridiction";
import {
  callGetBiometrie,
} from "../integrations/biometrie/client";
import { BIOMETRIE_DEFAULT_DEEP_LINK_APP } from "../integrations/biometrie/config";
import type {
  BiometrieStatusInput,
  StartBiometrieEnrolementInput,
} from "../schemas/biometrie.schema";

type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

type BiometrieLocalStatus = "AUCUN" | "EN_COURS" | "CONFIRME" | "ECHEC";

const BIOMETRIE_INITIAL_RECHECK_DELAY_MINUTES = 10;

function isAdminAccess(user?: AccessContext) {
  return user?.role?.nom === "ADMIN";
}

function buildBeneficiaireAccessFilter(user?: AccessContext): Prisma.BeneficiaireWhereInput {
  if (isAdminAccess(user)) {
    return {
      dossier: {
        is: {
          deletedAt: null,
        },
      },
    };
  }

  const code = getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__";

  return {
    dossier: {
      is: {
        deletedAt: null,
        juridictionId: code,
      },
    },
  };
}

function normalizeMany(value?: string) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function nextEvening(date: Date) {
  const evening = new Date(date);
  evening.setHours(20, 0, 0, 0);

  if (date.getHours() >= 20) {
    evening.setDate(evening.getDate() + 1);
  }

  return evening;
}

export function computeBiometrieNextVerificationDate(
  attempts: number,
  referenceDate = new Date(),
) {
  if (attempts <= 0) {
    return addMinutes(referenceDate, BIOMETRIE_INITIAL_RECHECK_DELAY_MINUTES);
  }

  if (attempts === 1) {
    return addMinutes(referenceDate, 30);
  }

  if (attempts === 2) {
    return addMinutes(referenceDate, 60);
  }

  return nextEvening(referenceDate);
}

function extractEnrollmentState(status?: string | null): BiometrieLocalStatus {
  if (status === "EN_COURS" || status === "CONFIRME" || status === "ECHEC") {
    return status;
  }

  return "AUCUN";
}

function resolveEnrollmentPayload(input: StartBiometrieEnrolementInput) {
  return {
    action: "get-fingerprint" as const,
    deepLinkApp: input.deepLinkApp?.trim() || BIOMETRIE_DEFAULT_DEEP_LINK_APP || undefined,
    application: input.application,
    many: normalizeMany(input.many),
  };
}

export async function startBiometrieEnrolement(
  input: StartBiometrieEnrolementInput,
  user?: AccessContext,
) {
  const beneficiaire = await prisma.beneficiaire.findFirst({
    where: {
      id: input.beneficiaireId,
      ...buildBeneficiaireAccessFilter(user),
    },
    select: {
      id: true,
      profilStatut: true,
      profilConfirme: true,
      biometrieEnrolementStatut: true,
      biometrieEnrolementCode: true,
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Beneficiaire introuvable");
  }

  const currentStatus = extractEnrollmentState(
    beneficiaire.biometrieEnrolementStatut,
  );

  if (currentStatus === "EN_COURS") {
    throw new HttpError(409, "Un enrôlement est déjà en cours pour ce bénéficiaire");
  }

  if (currentStatus === "CONFIRME") {
    throw new HttpError(409, "La biométrie de ce bénéficiaire est déjà configurée");
  }

  try {
    const response = await callGetBiometrie(resolveEnrollmentPayload(input));

    if (!response.success) {
      await prisma.beneficiaire.update({
        where: { id: beneficiaire.id },
        data: {
          biometrieEnrolementStatut: "ECHEC",
          biometrieEnrolementDemandeeLe: new Date(),
        },
      });

      throw new HttpError(502, response.message || "Impossible de lancer l'enrôlement biométrique");
    }

    const code = typeof response.data === "string" ? response.data.trim() : "";
    const deepLinkFamoco = typeof response.data2 === "string" ? response.data2.trim() : "";
    const isValid = Boolean(response.isValid);

    if (!code) {
      await prisma.beneficiaire.update({
        where: { id: beneficiaire.id },
        data: {
          biometrieEnrolementStatut: "ECHEC",
          biometrieEnrolementDemandeeLe: new Date(),
        },
      });

      throw new HttpError(502, "La justice n'a pas retourne de code d'enrôlement");
    }

    const statusLocal: BiometrieLocalStatus = isValid ? "CONFIRME" : "EN_COURS";

    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        biometrieEnrolementCode: code,
        biometrieEnrolementStatut: statusLocal,
        biometrieEnrolementDeepLinkFamoco: deepLinkFamoco || null,
        biometrieEnrolementApplication: input.application?.trim() || null,
        biometrieEnrolementMany: normalizeMany(input.many) || null,
        biometrieEnrolementDemandeeLe: new Date(),
        biometrieEnrolementConfirmeeLe: isValid ? new Date() : null,
        biometrieVerificationEssais: 0,
        biometrieDerniereVerificationLe: new Date(),
        biometrieProchaineVerificationLe: isValid
          ? null
          : computeBiometrieNextVerificationDate(0),
      },
    });

    return {
      beneficiaireId: beneficiaire.id,
      code,
      deepLinkFamoco: deepLinkFamoco || null,
      isValid,
      success: true,
      statusLocal,
      message: response.message || "Enrôlement biométrique lancé avec succès",
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        biometrieEnrolementStatut: "ECHEC",
        biometrieEnrolementDemandeeLe: new Date(),
      },
    });

    throw new HttpError(502, "Erreur lors du lancement de l'enrôlement biométrique");
  }
}

export async function getBiometrieEnrolementStatus(
  input: BiometrieStatusInput,
  user?: AccessContext,
) {
  const code = input.code.trim();

  const beneficiaire = await prisma.beneficiaire.findFirst({
    where: {
      biometrieEnrolementCode: code,
      ...buildBeneficiaireAccessFilter(user),
    },
    select: {
      id: true,
      biometrieEnrolementCode: true,
      biometrieEnrolementStatut: true,
      biometrieEnrolementDemandeeLe: true,
      biometrieEnrolementConfirmeeLe: true,
      biometrieVerificationEssais: true,
      biometrieDerniereVerificationLe: true,
      biometrieProchaineVerificationLe: true,
      biometrieEnrolementDeepLinkFamoco: true,
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Beneficiaire introuvable");
  }

  return {
    code,
    isValid: beneficiaire.biometrieEnrolementStatut === "CONFIRME",
    success: true,
    statusLocal: extractEnrollmentState(beneficiaire.biometrieEnrolementStatut),
    message: "Statut biométrique récupéré avec succès",
    data: {
      beneficiaireId: beneficiaire.id,
      biometrieEnrolementCode: beneficiaire.biometrieEnrolementCode,
      biometrieEnrolementStatut: beneficiaire.biometrieEnrolementStatut,
      biometrieEnrolementDemandeeLe:
        beneficiaire.biometrieEnrolementDemandeeLe?.toISOString() ?? null,
      biometrieEnrolementConfirmeeLe:
        beneficiaire.biometrieEnrolementConfirmeeLe?.toISOString() ?? null,
      biometrieVerificationEssais: beneficiaire.biometrieVerificationEssais,
      biometrieDerniereVerificationLe:
        beneficiaire.biometrieDerniereVerificationLe?.toISOString() ?? null,
      biometrieProchaineVerificationLe:
        beneficiaire.biometrieProchaineVerificationLe?.toISOString() ?? null,
      biometrieEnrolementDeepLinkFamoco:
        beneficiaire.biometrieEnrolementDeepLinkFamoco,
    },
  };
}
