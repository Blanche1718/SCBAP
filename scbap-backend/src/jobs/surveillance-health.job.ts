import prisma from "../prisma";
import { broadcastSurveillanceAlert } from "../services/surveillance-realtime.service";
import { createNotification } from "../services/notification.service";

const DEFAULT_CHECK_INTERVAL_MS = 60_000;
const DEFAULT_OFFLINE_AFTER_MINUTES = 15;

const CHECK_INTERVAL_MS = Number(process.env.SURVEILLANCE_HEALTH_CHECK_INTERVAL_MS ?? DEFAULT_CHECK_INTERVAL_MS);
const OFFLINE_AFTER_MINUTES = Number(process.env.SURVEILLANCE_OFFLINE_AFTER_MINUTES ?? DEFAULT_OFFLINE_AFTER_MINUTES);
const OFFLINE_AFTER_MS = OFFLINE_AFTER_MINUTES * 60 * 1000;

let timer: NodeJS.Timeout | null = null;
let running = false;

async function createOfflineAlert(args: {
  beneficiaireId: string;
  braceletId: string;
  deviceId: string;
  jurisdictionId?: string | null;
  lastSignalAt?: Date | null;
}) {
  const existingOpenAlert = await prisma.alerteSurveillance.findFirst({
    where: {
      beneficiaireId: args.beneficiaireId,
      braceletId: args.braceletId,
      type: "PERTE_SIGNAL",
      statut: "OUVERTE",
    },
    select: {
      id: true,
    },
  });

  if (existingOpenAlert) {
    return null;
  }

  const message = args.lastSignalAt
    ? `Aucun signal bracelet depuis ${OFFLINE_AFTER_MINUTES} minutes`
    : "Aucun signal bracelet reçu";

  const alerte = await prisma.alerteSurveillance.create({
    data: {
      beneficiaireId: args.beneficiaireId,
      braceletId: args.braceletId,
      type: "PERTE_SIGNAL",
      niveau: "NORMALE",
      message,
      source: "SYSTEME",
      statut: "OUVERTE",
      actionRecommandee: "Verifier la connectivite du bracelet et contacter le beneficiaire",
      metadata: {
        reason: "OFFLINE_HEALTH_CHECK",
        deviceId: args.deviceId,
        lastSignalAt: args.lastSignalAt?.toISOString() ?? null,
        offlineAfterMinutes: OFFLINE_AFTER_MINUTES,
      },
    },
  });

  await createNotification({
    beneficiaireId: args.beneficiaireId,
    type: "PERTE_SIGNAL",
    priorite: "NORMALE",
    targetType: "ALERTE_SURVEILLANCE",
    targetId: alerte.id,
    message,
    dateEnvoi: new Date(),
    metadata: {
      surveillanceAlerteId: alerte.id,
      reason: "OFFLINE_HEALTH_CHECK",
      deviceId: args.deviceId,
      lastSignalAt: args.lastSignalAt?.toISOString() ?? null,
    },
  });

  await broadcastSurveillanceAlert({
    id: alerte.id,
    beneficiaireId: args.beneficiaireId,
    braceletId: args.braceletId,
    deviceId: args.deviceId,
    type: "PERTE_SIGNAL",
    niveau: "NORMALE",
    message,
    source: "SYSTEME",
    statut: "OUVERTE",
    actionRecommandee: alerte.actionRecommandee,
    declencheeLe: alerte.declencheeLe.toISOString(),
  }, {
    jurisdictionId: args.jurisdictionId,
  });

  return alerte;
}

export async function checkSilentBracelets() {
  const cutoff = new Date(Date.now() - OFFLINE_AFTER_MS);
  const bracelets = await prisma.bracelet.findMany({
    where: {
      statut: "AFFECTE",
      OR: [
        { dernierSignalLe: null },
        { dernierSignalLe: { lt: cutoff } },
      ],
    },
    include: {
      affectations: {
        where: { dateFin: null },
        orderBy: { dateDebut: "desc" },
        take: 1,
        include: {
          beneficiaire: {
            include: {
              dossier: true,
            },
          },
        },
      },
    },
  });

  const created = [];

  for (const bracelet of bracelets) {
    const affectation = bracelet.affectations[0] ?? null;
    const beneficiaire = affectation?.beneficiaire ?? null;
    if (!beneficiaire) {
      continue;
    }

    if (bracelet.statutConnexion !== "HORS_LIGNE") {
      await prisma.bracelet.update({
        where: { id: bracelet.id },
        data: { statutConnexion: "HORS_LIGNE" },
      });
    }

    const alerte = await createOfflineAlert({
      beneficiaireId: beneficiaire.id,
      braceletId: bracelet.id,
      deviceId: bracelet.codeImei,
      jurisdictionId: beneficiaire.dossier.juridictionId ?? null,
      lastSignalAt: bracelet.dernierSignalLe,
    });

    if (alerte) {
      created.push(alerte);
    }
  }

  return created;
}

export function initializeSurveillanceHealthJob() {
  if (timer) {
    return;
  }

  console.log(
    `[SURVEILLANCE_HEALTH_JOB] Initializing health check every ${Math.round(CHECK_INTERVAL_MS / 1000)}s; offline after ${OFFLINE_AFTER_MINUTES} minute(s).`,
  );

  timer = setInterval(() => {
    if (running) {
      return;
    }

    running = true;
    void checkSilentBracelets()
      .then((alertes) => {
        if (alertes.length > 0) {
          console.log(`[SURVEILLANCE_HEALTH_JOB] Created ${alertes.length} offline alert(s).`);
        }
      })
      .catch((error) => {
        console.error("[SURVEILLANCE_HEALTH_JOB] Error:", error);
      })
      .finally(() => {
        running = false;
      });
  }, CHECK_INTERVAL_MS);
}

export function stopSurveillanceHealthJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
}
