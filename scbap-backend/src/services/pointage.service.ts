import { Prisma } from "@prisma/client";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import { createNotification } from "./notification.service";
import type { AlerteSurveillance } from "@prisma/client";
import { buildDateInAppTimeZone, getStartOfAppDay, getTimeZoneDateParts } from "../utils/timezone";

type PointageFilters = {
  search?: string;
  statut?: string;
  date?: string;
  lieu?: string;
  type?: string;
};

type BiometricPointageInput = {
  nfc: string;
  timestamp: string;
  centreNom?: string;
  deviceId?: string;
  success: boolean;
};

export async function getPointages(
  page = 1,
  limit = 10,
  filters: PointageFilters = {},
) {
  if (page <= 0 || limit <= 0) {
    throw new HttpError(400, "Parametres de pagination invalides");
  }

  const where: Prisma.PointageWhereInput = {};

  if (filters.statut) {
    where.statut = filters.statut;
  }

  if (filters.lieu) {
    where.lieu = {
      contains: filters.lieu.trim(),
      mode: "insensitive",
    };
  }

  if (filters.type) {
    where.type = {
      contains: filters.type.trim(),
      mode: "insensitive",
    };
  }

  if (filters.date) {
    const date = new Date(filters.date);
    if (Number.isNaN(date.getTime())) {
      throw new HttpError(400, "Le parametre \"date\" est invalide");
    }
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.dateHeure = {
      gte: date,
      lt: nextDay,
    };
  }

  if (filters.search) {
    const query = filters.search.trim();
    where.OR = [
      {
        commentaire: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        lieu: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        type: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        beneficiaire: {
          dossier: {
            nom: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        beneficiaire: {
          dossier: {
            prenom: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        beneficiaire: {
          dossier: {
            numeroDossier: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        nfc: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        centreNom: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        deviceId: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  const skip = (page - 1) * limit;
  const [pointages, total, globalStats] = await prisma.$transaction([
    prisma.pointage.findMany({
      where,
      orderBy: { dateHeure: "desc" },
      include: {
        beneficiaire: {
          include: {
            dossier: true,
          },
        },
        obligation: true,
      },
      skip,
      take: limit,
    }),
    prisma.pointage.count({ where }),
    // Statistiques globales (tous les pointages du système)
    prisma.pointage.groupBy({
      by: ["statut"],
      _count: {
        statut: true,
      },
    }),
  ]);

  // Transformer les statistiques globales en format plus simple
  const stats = globalStats.reduce(
    (acc, stat) => {
      acc[stat.statut.toLowerCase() as keyof typeof acc] = stat._count.statut;
      return acc;
    },
    { valide: 0, absent: 0, en_retard: 0, anomalie: 0 },
  );

  return {
    data: pointages,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      globalStats: stats,
    },
  };
}

export async function getPointageById(id: string) {
  return prisma.pointage.findUniqueOrThrow({
    where: { id },
    include: {
      beneficiaire: {
        include: {
          dossier: true,
        },
      },
      obligation: true,
      agent: true,
    },
  });
}

function parsePointageDate(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Le parametre \"timestamp\" est invalide");
  }

  return parsed;
}

export async function createBiometricPointage(input: BiometricPointageInput) {
  const nfc = input.nfc.trim();
  if (!nfc) {
    throw new HttpError(400, "Le parametre \"nfc\" est requis");
  }

  const beneficiaire = await prisma.beneficiaire.findFirst({
    where: {
      badgeNfc: nfc,
      dossier: {
        is: {
          deletedAt: null,
        },
      },
    },
    include: {
      dossier: true,
      obligations: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Aucun beneficiaire associe a ce badge NFC");
  }

  const dateHeure = parsePointageDate(input.timestamp);
  const firstObligation = beneficiaire.obligations[0] ?? null;
  const type = "BIOMETRIE";
  const statut = input.success ? "VALIDE" : "ANOMALIE";
  const commentaire = [
    input.centreNom ? `Centre: ${input.centreNom}` : null,
    input.deviceId ? `Device: ${input.deviceId}` : null,
    `NFC: ${nfc}`,
    input.success ? "Biometrie validee" : "Biometrie non validee",
  ]
    .filter(Boolean)
    .join(" | ");

  const pointage = await prisma.pointage.create({
    data: {
      beneficiaireId: beneficiaire.id,
      ...(firstObligation ? { obligationId: firstObligation.id } : {}),
      dateHeure,
      lieu: input.centreNom?.trim() || beneficiaire.dossier.prisonName || null,
      nfc,
      centreNom: input.centreNom?.trim() || null,
      deviceId: input.deviceId?.trim() || null,
      type,
      statut,
      source: "FAMOCO",
      externalSuccess: input.success,
      externalPayload: {
        nfc,
        timestamp: input.timestamp,
        centreNom: input.centreNom ?? null,
        deviceId: input.deviceId ?? null,
        success: input.success,
      },
      commentaire,
    },
    include: {
      beneficiaire: {
        include: {
          dossier: true,
        },
      },
      obligation: true,
    },
  });

  if (statut !== "VALIDE") {
    await createNotification({
      beneficiaireId: beneficiaire.id,
      pointageId: pointage.id,
      type: "POINTAGE_ANOMALIE",
      priorite: "NORMALE",
      targetType: "POINTAGE",
      targetId: pointage.id,
      message: "Pointage anormal détecté",
      dateEnvoi: pointage.dateHeure,
      metadata: {
        pointageId: pointage.id,
        statut,
        centreNom: input.centreNom ?? null,
        deviceId: input.deviceId ?? null,
        success: input.success,
        eventAt: pointage.dateHeure.toISOString(),
      },
    });
  }

  return {
    pointage,
    beneficiaire: {
      id: beneficiaire.id,
      nom: beneficiaire.dossier.nom,
      prenom: beneficiaire.dossier.prenom,
      numeroDossier: beneficiaire.dossier.numeroDossier,
      badgeNfc: nfc,
    },
  };
}

export async function checkAndCreateAbsentPointages() {
  const now = new Date();
  const today = getStartOfAppDay(now);
  const todayParts = getTimeZoneDateParts(now);
  const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Get all active POINTAGE obligations
  const obligations = await prisma.obligation.findMany({
    where: {
      type: "POINTAGE",
      statut: "EN_COURS",
      dateDebut: {
        lte: today,
      },
      OR: [
        {
          dateFin: {
            gte: today,
          },
        },
        {
          dateFin: null,
        },
      ],
    },
    include: {
      beneficiaire: {
        include: {
          dossier: true,
        },
      },
      reglesHoraires: true,
    },
  });

  const absentPointages: AlerteSurveillance[] = [];

  function parseObligationTime(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return {
        hours: value.getUTCHours(),
        minutes: value.getUTCMinutes(),
      };
    }

    const match = String(value).match(/^(\d{2}):(\d{2})/);
    if (!match) {
      return null;
    }

    return {
      hours: Number(match[1]),
      minutes: Number(match[2]),
    };
  }

  for (const obligation of obligations) {
    // Get scheduled time from obligation
    const scheduledTime = parseObligationTime(obligation.heure);
    if (!scheduledTime) {
      continue;
    }

    const { hours, minutes } = scheduledTime;

    // Validate parsed time
    if (isNaN(hours) || isNaN(minutes)) continue;

    const scheduledDate = buildDateInAppTimeZone({
      year: todayParts.year,
      month: todayParts.month,
      day: todayParts.day,
      hour: hours,
      minute: minutes,
      second: 0,
    });

    // Check if scheduled time has already passed
    if (scheduledDate > now) continue;

    // Check if there's already a VALIDE pointage for today at this obligation
    const existingPointage = await prisma.pointage.findFirst({
      where: {
        obligationId: obligation.id,
        dateHeure: {
          gte: today,
          lt: endOfDay,
        },
        statut: "VALIDE",
      },
    });

    if (existingPointage) continue;

    // Create absent pointage
    const absentPointage = await prisma.pointage.create({
      data: {
        beneficiaireId: obligation.beneficiaireId,
        obligationId: obligation.id,
        dateHeure: scheduledDate,
        lieu: obligation.lieu || obligation.beneficiaire.dossier.prisonName || null,
        type: "AUTOMATIQUE",
        statut: "ABSENT",
        source: "SYSTEME",
        commentaire: `Absence détectée automatiquement à ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      },
      include: {
        beneficiaire: {
          include: {
            dossier: true,
          },
        },
      },
    });

    // Create alert
    const alert = await prisma.alerteSurveillance.create({
      data: {
        beneficiaireId: obligation.beneficiaireId,
        type: "ABSENCE_POINTAGE",
        niveau: "NORMALE",
        message: `${obligation.beneficiaire.dossier.prenom} ${obligation.beneficiaire.dossier.nom} est absent du pointage programmé à ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} au ${obligation.lieu || "lieu programmé"}`,
        source: "SYSTEME",
        statut: "OUVERTE",
        actionRecommandee: "Vérifier l'absence et contacter le détenu si nécessaire",
        metadata: {
          obligationId: obligation.id,
          pointageId: absentPointage.id,
          scheduledTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
          lieu: obligation.lieu,
        },
      },
    });

    absentPointages.push(alert);

    // Create notification
    await createNotification({
      beneficiaireId: obligation.beneficiaireId,
      pointageId: absentPointage.id,
      type: "ABSENCE_POINTAGE",
      priorite: "NORMALE",
      targetType: "POINTAGE",
      targetId: absentPointage.id,
      message: `Absence détectée au pointage de ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      dateEnvoi: scheduledDate,
      metadata: {
        pointageId: absentPointage.id,
        obligationId: obligation.id,
        lieu: obligation.lieu,
        eventAt: scheduledDate.toISOString(),
      },
    });
  }

  return absentPointages;
}
