import prisma from "../prisma";
import { getFingerprintStatus } from "../integrations/biometrie/client";
import {
  computeBiometrieNextVerificationDate,
  ensureBiometrieConfiguredNotification,
} from "../services/biometrie.service";

const BIOMETRIE_SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;

let schedulerStarted = false;
let schedulerRunning = false;
let schedulerTimer: NodeJS.Timeout | null = null;

function isConfirmable(response: { success: boolean; isValid?: boolean }) {
  return response.success && Boolean(response.isValid);
}

async function processDueEnrollment(beneficiaire: {
  id: string;
  biometrieEnrolementCode: string | null;
  biometrieVerificationEssais: number;
}) {
  if (!beneficiaire.biometrieEnrolementCode) {
    return;
  }

  try {
    console.log(`[biometrie-scheduler] Vérification du code ${beneficiaire.biometrieEnrolementCode}...`);
    const response = await getFingerprintStatus(beneficiaire.biometrieEnrolementCode);
    const now = new Date();

    console.log(`[biometrie-scheduler] Réponse API : success=${response.success}, isValid=${response.isValid}`);

    if (isConfirmable(response)) {
      console.log(`[biometrie-scheduler] ✅ Enrôlement confirmé pour ${beneficiaire.id}`);
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
      return;
    }

    const nextAttempts = beneficiaire.biometrieVerificationEssais + 1;
    console.log(`[biometrie-scheduler] ⏳ Essai ${nextAttempts} pour ${beneficiaire.id}`);

    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        biometrieEnrolementStatut: "EN_COURS",
        biometrieDerniereVerificationLe: now,
        biometrieProchaineVerificationLe: computeBiometrieNextVerificationDate(nextAttempts, now),
        biometrieVerificationEssais: nextAttempts,
      },
    });
  } catch (error) {
    const now = new Date();
    const nextAttempts = beneficiaire.biometrieVerificationEssais + 1;

    console.error(
      `[biometrie-scheduler] ❌ Erreur lors de la vérification du code ${beneficiaire.biometrieEnrolementCode}:`,
      error instanceof Error ? error.message : error
    );

    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        biometrieEnrolementStatut: "EN_COURS",
        biometrieDerniereVerificationLe: now,
        biometrieProchaineVerificationLe: computeBiometrieNextVerificationDate(nextAttempts, now),
        biometrieVerificationEssais: nextAttempts,
      },
    });
  }
}

async function loadPendingEnrollments(forceAllPending = false) {
  const now = new Date();

  return prisma.beneficiaire.findMany({
    where: {
      biometrieEnrolementStatut: "EN_COURS",
      biometrieEnrolementCode: {
        not: null,
      },
      ...(forceAllPending
        ? {}
        : {
            OR: [
              {
                biometrieProchaineVerificationLe: null,
              },
              {
                biometrieProchaineVerificationLe: {
                  lte: now,
                },
              },
            ],
          }),
    },
    select: {
      id: true,
      biometrieEnrolementCode: true,
      biometrieVerificationEssais: true,
    },
    orderBy: [
      { biometrieProchaineVerificationLe: "asc" },
      { biometrieEnrolementDemandeeLe: "asc" },
    ],
  });
}

async function runBiometrieScheduler() {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;
  try {
    const dueBeneficiaires = await loadPendingEnrollments(false);

    if (dueBeneficiaires.length > 0) {
      console.log(`[biometrie-scheduler] Vérification de ${dueBeneficiaires.length} enrôlement(s) en cours...`);
    }

    for (const beneficiaire of dueBeneficiaires) {
      await processDueEnrollment(beneficiaire);
    }
  } catch (error) {
    console.error("[biometrie-scheduler] Erreur lors de la vérification :", error);
  } finally {
    schedulerRunning = false;
  }
}

async function runBiometrieStartupSweep() {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;
  try {
    const pendingBeneficiaires = await loadPendingEnrollments(true);

    if (pendingBeneficiaires.length > 0) {
      console.log(
        `[biometrie-scheduler] Vérification immédiate de ${pendingBeneficiaires.length} enrôlement(s) au démarrage...`,
      );
    }

    for (const beneficiaire of pendingBeneficiaires) {
      await processDueEnrollment(beneficiaire);
    }
  } catch (error) {
    console.error("[biometrie-scheduler] Erreur lors de la vérification au démarrage :", error);
  } finally {
    schedulerRunning = false;
  }
}

export function startBiometrieScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  console.log("[biometrie-scheduler] Démarrage du scheduler biométrique...");

  void runBiometrieStartupSweep().then(() => {
    void runBiometrieScheduler();
  });
  schedulerTimer = setInterval(() => {
    void runBiometrieScheduler();
  }, BIOMETRIE_SCHEDULER_INTERVAL_MS);

  console.log(`[biometrie-scheduler] Scheduler actif - vérification toutes les ${BIOMETRIE_SCHEDULER_INTERVAL_MS / 1000 / 60} minutes`);
}

export function stopBiometrieScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  schedulerStarted = false;
  schedulerRunning = false;
}
