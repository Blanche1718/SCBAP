import { Prisma } from "@prisma/client";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import { AuthenticatedUser } from "../auth/auth.types";
import { getUserJuridictionCode } from "../utils/juridiction";
import {
  callGetBiometrie,
  getFingerprintStatus,
} from "../integrations/biometrie/client";
import { BIOMETRIE_DEFAULT_DEEP_LINK_APP } from "../integrations/biometrie/config";
import { createNotification } from "./notification.service";
import  {
  BiometrieStatusInput,
  StartBiometrieEnrolementInput,
} from "../schemas/biometrie.schema";

type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

type BiometrieLocalStatus = "AUCUN" | "EN_COURS" | "CONFIRME" | "ECHEC";

const BIOMETRIE_INITIAL_RECHECK_DELAY_MINUTES = 10;

function isConfirmable(response: { success: boolean; isValid?: boolean }) {
  return response.success && Boolean(response.isValid);
}

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

export async function ensureBiometrieConfiguredNotification(input: {
  beneficiaireId: string;
  code: string;
  confirmedAt?: Date | null;
}) {
  const beneficiaire = await prisma.beneficiaire.findUnique({
    where: { id: input.beneficiaireId },
    select: {
      id: true,
      biometrieEnrolementConfirmeeLe: true,
      dossier: {
        select: {
          nom: true,
          prenom: true,
          numeroDossier: true,
        },
      },
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Beneficiaire introuvable");
  }

  const confirmedAt = input.confirmedAt ?? beneficiaire.biometrieEnrolementConfirmeeLe ?? new Date();
  const existingNotification = await prisma.notification.findFirst({
    where: {
      beneficiaireId: beneficiaire.id,
      type: "BIOMETRIE_CONFIGUREE",
      targetType: "BENEFICIAIRE",
      targetId: beneficiaire.id,
      dateEnvoi: {
        gte: new Date(confirmedAt.getTime() - 60 * 1000),
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      dateEnvoi: "desc",
    },
  });

  if (existingNotification) {
    return existingNotification;
  }

  return createNotification({
    beneficiaireId: beneficiaire.id,
    type: "BIOMETRIE_CONFIGUREE",
    priorite: "INFO",
    targetType: "BENEFICIAIRE",
    targetId: beneficiaire.id,
    message: `Biométrie configurée pour ${beneficiaire.dossier.prenom} ${beneficiaire.dossier.nom}`.trim(),
    dateEnvoi: confirmedAt,
    metadata: {
      code: input.code,
      numeroDossier: beneficiaire.dossier.numeroDossier,
      eventAt: confirmedAt.toISOString(),
    },
  });
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
      dossier: {
        select: {
          nom: true,
          prenom: true,
          numeroDossier: true,
        },
      },
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

    if (isValid) {
      await ensureBiometrieConfiguredNotification({
        beneficiaireId: beneficiaire.id,
        code,
      });
    }

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

  if (beneficiaire.biometrieEnrolementStatut === "CONFIRME") {
    await ensureBiometrieConfiguredNotification({
      beneficiaireId: beneficiaire.id,
      code,
      confirmedAt: beneficiaire.biometrieEnrolementConfirmeeLe,
    });
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

export async function forceVerifyBiometrieEnrolement(
  beneficiaireId: string,
  user?: AccessContext,
) {
  const beneficiaire = await prisma.beneficiaire.findFirst({
    where: {
      id: beneficiaireId,
      ...buildBeneficiaireAccessFilter(user),
    },
    select: {
      id: true,
      biometrieEnrolementCode: true,
      biometrieEnrolementStatut: true,
      biometrieVerificationEssais: true,
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Beneficiaire introuvable");
  }

  if (beneficiaire.biometrieEnrolementStatut === "CONFIRME") {
    throw new HttpError(409, "La biométrie de ce bénéficiaire est déjà configurée");
  }

  if (!beneficiaire.biometrieEnrolementCode) {
    throw new HttpError(400, "Aucun code d'enrôlement trouvé");
  }

  if (beneficiaire.biometrieEnrolementStatut !== "EN_COURS") {
    throw new HttpError(400, "L'enrôlement n'est pas en cours");
  }

  try {
    console.log(`[biometrie-admin] Force vérification pour ${beneficiaireId} avec code ${beneficiaire.biometrieEnrolementCode}`);
    
    // Utilise la même vérification que le scheduler
    const statusResponse = await getFingerprintStatus(beneficiaire.biometrieEnrolementCode);
    const now = new Date();

    console.log(`[biometrie-admin] Réponse API : success=${statusResponse.success}, isValid=${statusResponse.isValid}`);

    if (isConfirmable(statusResponse)) {
      console.log(`[biometrie-admin] ✅ Biométrie confirmée lors de la vérification forcée`);
      await prisma.beneficiaire.update({
        where: { id: beneficiaire.id },
        data: {
          biometrieEnrolementStatut: "CONFIRME",
          biometrieEnrolementConfirmeeLe: now,
          biometrieDerniereVerificationLe: now,
          biometrieProchaineVerificationLe: null,
          biometrieVerificationEssais: beneficiaire.biometrieVerificationEssais + 1,
        },
      });

      await ensureBiometrieConfiguredNotification({
        beneficiaireId: beneficiaire.id,
        code: beneficiaire.biometrieEnrolementCode,
        confirmedAt: now,
      });

      return {
        success: true,
        message: "Enrôlement confirmé avec succès",
        statusLocal: "CONFIRME",
      };
    }

    console.log(`[biometrie-admin] ⏳ Enrôlement toujours en attente`);
    const nextAttempts = beneficiaire.biometrieVerificationEssais + 1;
    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        biometrieEnrolementStatut: "EN_COURS",
        biometrieDerniereVerificationLe: now,
        biometrieProchaineVerificationLe: computeBiometrieNextVerificationDate(nextAttempts, now),
        biometrieVerificationEssais: nextAttempts,
      },
    });

    return {
      success: true,
      message: "Vérification en cours - biométrie non encore confirmée",
      statusLocal: "EN_COURS",
    };
  } catch (error) {
    const now = new Date();
    const nextAttempts = beneficiaire.biometrieVerificationEssais + 1;

    console.error(`[biometrie-admin] ❌ Erreur lors de la vérification forcée:`, error instanceof Error ? error.message : error);

    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        biometrieEnrolementStatut: "EN_COURS",
        biometrieDerniereVerificationLe: now,
        biometrieProchaineVerificationLe: computeBiometrieNextVerificationDate(nextAttempts, now),
        biometrieVerificationEssais: nextAttempts,
      },
    });

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(502, "Erreur lors de la vérification de l'enrôlement");
  }
}
