import { Prisma } from "@prisma/client";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import {
  BraceletTelemetrySchema,
  type BraceletTelemetryInput,
} from "../schemas/bracelet-telemetry.schema";
import {
  broadcastSurveillanceAlert,
  broadcastSurveillanceTelemetry,
} from "./surveillance-realtime.service";
import { createNotification } from "./notification.service";

type TelemetryFinding = {
  type: string;
  niveau: "CRITIQUE" | "NORMALE";
  message: string;
  actionRecommandee?: string;
  incidentType?: string;
};

const ALERT_DEDUPE_WINDOW_MS = Number(process.env.SURVEILLANCE_ALERT_DEDUPE_MINUTES ?? "10") * 60 * 1000;

function parseTelemetryPayload(payload: Buffer | string | unknown): BraceletTelemetryInput {
  // Le payload peut être un Buffer (MQTT), une string JSON, ou déjà un objet parsé
  const raw =
    Buffer.isBuffer(payload) ? payload.toString("utf-8") : typeof payload === "string" ? payload : payload;

  let candidate: unknown = raw;
  // Si c'est une string, on tente de parser le JSON. Sinon on suppose que c'est déjà un objet.

  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Payload bracelet MQTT invalide");
    }
  }

  return BraceletTelemetrySchema.parse(candidate);
}

function buildFindings(input: BraceletTelemetryInput): TelemetryFinding[] {
  const findings: TelemetryFinding[] = [];
  const battery = input.health.battery_pct;
  const strapStatus = input.alerts.strap_status;

  if (input.alerts.geofence_breach || input.location.zone_status === "OUTSIDE") {
    findings.push({
      type: "SORTIE_ZONE",
      niveau: "CRITIQUE",
      message: "Sortie de zone detectee",
      actionRecommandee: "Verifier la position du porteur et contacter le beneficiaire",
      incidentType: "ANOMALIE",
    });
  }

  if (strapStatus === 1) {
    findings.push({
      type: "RETRAIT",
      niveau: "CRITIQUE",
      message: "Capteur bracelet rompu ou bracelet retire",
      actionRecommandee: "Verifier immediatement le bracelet",
      incidentType: "RETRAIT",
    });
  }

  if (input.alerts.case_tamper) {
    findings.push({
      type: "TAMPER",
      niveau: "CRITIQUE",
      message: "Ouverture ou sabotage du boitier detecte",
      actionRecommandee: "Intervenir sur site",
      incidentType: "ANOMALIE",
    });
  }

  if (battery !== undefined && battery < 15) {
    findings.push({
      type: "BATTERIE_FAIBLE",
      niveau: "NORMALE",
      message: "Batterie faible",
      actionRecommandee: "Planifier la recharge ou le remplacement",
      incidentType: "BATTERIE_FAIBLE",
    });
  }

  if (input.alerts.gps_lost) {
    findings.push({
      type: "PERTE_SIGNAL",
      niveau: "NORMALE",
      message: "Perte du signal GPS detectee",
      actionRecommandee: "Verifier la couverture GPS",
      incidentType: "PERTE_SIGNAL",
    });
  }

  if (input.alerts.gprs_lost) {
    findings.push({
      type: "PERTE_SIGNAL",
      niveau: "NORMALE",
      message: "Perte du signal GPRS detectee",
      actionRecommandee: "Verifier la connectivite reseau",
      incidentType: "PERTE_SIGNAL",
    });
  }

  if (input.alerts.power_loss) {
    findings.push({
      type: "POWER_FAIL",
      niveau: "CRITIQUE",
      message: "Coupure d'alimentation detectee",
      actionRecommandee: "Verifier l'alimentation du dispositif",
      incidentType: "POWER_FAIL",
    });
  }

  if (findings.length === 0 && input.status !== "OK") {
    findings.push({
      type: "ANOMALIE",
      niveau: "NORMALE",
      message: `Statut bracelet non standard: ${input.status}`,
      actionRecommandee: "Verifier le dispositif",
      incidentType: "ANOMALIE",
    });
  }

  return findings;
}

function buildConnectionStatus(input: BraceletTelemetryInput, findings: TelemetryFinding[]) {
  if (findings.some((finding) => finding.niveau === "CRITIQUE")) {
    return "ALERTE";
  }

  if (input.status === "OK") {
    return "EN_LIGNE";
  }

  return "INCONNU";
}

// Construit une string de commentaire pour les alertes à partir des données de télémétrie et des findings associés
function buildCommentaire(input: BraceletTelemetryInput, findings: TelemetryFinding[]) {
  const fragments = [
    `device_id=${input.device_id}`,
    input.user_id ? `user_id=${input.user_id}` : null,
    `status=${input.status}`,
    input.location.zone_id ? `zone=${input.location.zone_id}` : null,
    input.location.zone_status ? `zone_status=${input.location.zone_status}` : null,
    input.alerts.geofence_breach ? "geofence_breach=true" : null,
    input.alerts.gps_lost ? "gps_lost=true" : null,
    input.alerts.gprs_lost ? "gprs_lost=true" : null,
    input.alerts.case_tamper ? "case_tamper=true" : null,
    input.alerts.power_loss ? "power_loss=true" : null,
    findings.length ? `findings=${findings.map((finding) => finding.type).join(",")}` : null,
  ];

  return fragments.filter(Boolean).join(" | ");
}

// Résout le bracelet et le bénéficiaire associés au payload de télémétrie, ou lance une erreur 404 si aucun n'est trouvé
async function resolveBraceletOrThrow(input: BraceletTelemetryInput) {
  const bracelet = await prisma.bracelet.findFirst({
    where: {
      OR: [
        { codeImei: input.device_id },
        ...(input.user_id ? [{ identifiantPorteur: input.user_id }] : []),
      ],
    },
    include: {
      affectations: {
        orderBy: [{ dateDebut: "desc" }, { dateFin: "desc" }],
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

  if (!bracelet) {
    throw new HttpError(
      404,
      `Aucun bracelet associe au device_id "${input.device_id}"`,
    );
  }

  const affectation = bracelet.affectations[0] ?? null;
  if (!affectation) {
    throw new HttpError(
      404,
      `Aucune affectation active trouvee pour le bracelet "${input.device_id}"`,
    );
  }

  return {
    bracelet,
    beneficiaire: affectation.beneficiaire,
  };
}

// Crée les alertes de surveillance et incidents associés aux findings détectés pour une télémétrie donnée
async function createAlertesAndIncidents(args: {
  beneficiaireId: string;
  braceletId: string;
  deviceId: string;
  positionGPSId: string;
  scopeJurisdictionId?: string | null;
  findings: TelemetryFinding[];
  rawPayload: BraceletTelemetryInput;
}) {
  for (const finding of args.findings) {
    const dedupeSince = new Date(Date.now() - ALERT_DEDUPE_WINDOW_MS);
    const existingOpenAlert = await prisma.alerteSurveillance.findFirst({
      where: {
        beneficiaireId: args.beneficiaireId,
        braceletId: args.braceletId,
        type: finding.type,
        statut: "OUVERTE",
        declencheeLe: {
          gte: dedupeSince,
        },
      },
      orderBy: {
        declencheeLe: "desc",
      },
      select: {
        id: true,
      },
    });

    if (existingOpenAlert) {
      continue;
    }

    const alerte = await prisma.alerteSurveillance.create({
      data: {
        beneficiaireId: args.beneficiaireId,
        braceletId: args.braceletId,
        positionGPSId: args.positionGPSId,
        type: finding.type,
        niveau: finding.niveau,
        message: finding.message,
        source: "BRACELET",
        statut: "OUVERTE",
        actionRecommandee: finding.actionRecommandee ?? null,
        metadata: args.rawPayload as unknown as Prisma.InputJsonValue,
      },
    });

    await broadcastSurveillanceAlert({
      id: alerte.id,
      beneficiaireId: args.beneficiaireId,
      braceletId: args.braceletId,
      deviceId: args.deviceId,
      positionGPSId: args.positionGPSId,
      type: finding.type,
      niveau: finding.niveau,
      message: finding.message,
      source: "BRACELET",
      statut: "OUVERTE",
      actionRecommandee: finding.actionRecommandee ?? null,
      declencheeLe: new Date().toISOString(),
    }, {
      jurisdictionId: args.scopeJurisdictionId,
    });

    await createNotification({
      beneficiaireId: args.beneficiaireId,
      type: finding.type,
      priorite: finding.niveau,
      targetType: "ALERTE_SURVEILLANCE",
      targetId: alerte.id,
      message: finding.message,
      dateEnvoi: new Date(),
      metadata: {
        ...args.rawPayload,
        surveillanceAlerteId: alerte.id,
        finding: {
          type: finding.type,
          niveau: finding.niveau,
          message: finding.message,
        },
        eventAt: new Date().toISOString(),
      },
    });

    if (finding.incidentType) {
      await prisma.incidentBracelet.create({
        data: {
          beneficiaireId: args.beneficiaireId,
          braceletId: args.braceletId,
          type: finding.incidentType,
          description: finding.message,
          dateHeure: new Date(args.rawPayload.timestamp),
          statut: "OUVERT",
        },
      });
    }
  }
}

// Détermine le statut de connexion du bracelet à partir des données de télémétrie et des findings associés
export async function handleBraceletTelemetryMessage(payload: Buffer | string | unknown) {
  // 1. Parse et valide le payload de télémétrie
  const input = parseTelemetryPayload(payload);
  // 2. Convertit le timestamp en objet Date et vérifie sa validité
  const telemetryDate = new Date(input.timestamp);
  // 
  if (Number.isNaN(telemetryDate.getTime())) {
    throw new HttpError(400, "Le parametre \"timestamp\" est invalide");
  }

  const { bracelet, beneficiaire } = await resolveBraceletOrThrow(input);
  const scopeJurisdictionId = beneficiaire.dossier.juridictionId ?? null;
  const findings = buildFindings(input);
  const statutConnexion = buildConnectionStatus(input, findings);
  const commentaire = buildCommentaire(input, findings);

  const positionGPS = await prisma.positionGPS.create({
    data: {
      braceletId: bracelet.id,
      beneficiaireId: beneficiaire.id,
      porteurExterneId: input.user_id ?? bracelet.identifiantPorteur ?? null,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracyMeters: input.location.accuracy ?? null,
      presenceFlag: input.location.presence_flag ?? null,
      rssiDbm: input.location.rssi_dbm ?? null,
      zoneExterneId: input.location.zone_id ?? null,
      zoneStatus: input.location.zone_status ?? null,
      batterie: input.health.battery_pct ?? null,
      powerSource: input.health.power_source ?? null,
      gprsSignal: input.health.gprs_signal ?? null,
      gpsSatellites: input.health.gps_satellites ?? null,
      strapStatus: input.alerts.strap_status ?? null,
      geofenceBreach: input.alerts.geofence_breach ?? null,
      gpsLost: input.alerts.gps_lost ?? null,
      gprsLost: input.alerts.gprs_lost ?? null,
      caseTamper: input.alerts.case_tamper ?? null,
      powerLoss: input.alerts.power_loss ?? null,
      statutBracelet: input.status,
      heartbeat: input.heartbeat ?? input.status === "OK",
      rawPayload: input as unknown as Prisma.InputJsonValue,
      dateHeure: telemetryDate,
    },
  });

  await prisma.bracelet.update({
    where: { id: bracelet.id },
    data: {
      dernierSignalLe: telemetryDate,
      dernierePositionLe: telemetryDate,
      statutConnexion,
    },
  });

  await createAlertesAndIncidents({
    beneficiaireId: beneficiaire.id,
    braceletId: bracelet.id,
    deviceId: bracelet.codeImei,
    positionGPSId: positionGPS.id,
    scopeJurisdictionId,
    findings,
    rawPayload: input,
  });

  await broadcastSurveillanceTelemetry(input as unknown as Record<string, unknown>, {
    jurisdictionId: scopeJurisdictionId,
  });

  return {
    bracelet: {
      id: bracelet.id,
      codeImei: bracelet.codeImei,
      statutConnexion,
    },
    beneficiaire: {
      id: beneficiaire.id,
      nom: beneficiaire.dossier.nom,
      prenom: beneficiaire.dossier.prenom,
      numeroDossier: beneficiaire.dossier.numeroDossier,
    },
    positionGPSId: positionGPS.id,
    findings,
    commentaire,
  };
}
