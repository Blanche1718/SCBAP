import prisma from "../prisma";
import { getFingerprintStatus } from "../integrations/biometrie/client";
import {
  computeBiometrieNextVerificationDate,
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
    const response = await getFingerprintStatus(beneficiaire.biometrieEnrolementCode);
    const now = new Date();

    if (isConfirmable(response)) {
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
      return;
    }

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
  } catch {
    const now = new Date();
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
  }
}

async function runBiometrieScheduler() {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;
  try {
    const now = new Date();
    const dueBeneficiaires = await prisma.beneficiaire.findMany({
      where: {
        biometrieEnrolementStatut: "EN_COURS",
        biometrieEnrolementCode: {
          not: null,
        },
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
      },
      select: {
        id: true,
        biometrieEnrolementCode: true,
        biometrieVerificationEssais: true,
      },
      take: 25,
      orderBy: [
        { biometrieProchaineVerificationLe: "asc" },
        { biometrieEnrolementDemandeeLe: "asc" },
      ],
    });

    for (const beneficiaire of dueBeneficiaires) {
      await processDueEnrollment(beneficiaire);
    }
  } finally {
    schedulerRunning = false;
  }
}

export function startBiometrieScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  void runBiometrieScheduler();
  schedulerTimer = setInterval(() => {
    void runBiometrieScheduler();
  }, BIOMETRIE_SCHEDULER_INTERVAL_MS);
}

export function stopBiometrieScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  schedulerStarted = false;
  schedulerRunning = false;
}
