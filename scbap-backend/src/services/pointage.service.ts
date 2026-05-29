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

const DAY_NAME_TO_INDEX = new Map([
  ["DIMANCHE", 0],
  ["SUNDAY", 0],
  ["LUNDI", 1],
  ["MONDAY", 1],
  ["MARDI", 2],
  ["TUESDAY", 2],
  ["MERCREDI", 3],
  ["WEDNESDAY", 3],
  ["JEUDI", 4],
  ["THURSDAY", 4],
  ["VENDREDI", 5],
  ["FRIDAY", 5],
  ["SAMEDI", 6],
  ["SATURDAY", 6],
]);

function normalizeScheduleValue(value?: string | null) {
  return value
    ?.trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function getAppDayIndex(date: Date) {
  const parts = getTimeZoneDateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function getAppDayOfMonth(date: Date) {
  return getTimeZoneDateParts(date).day;
}

function getDaysInAppMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildStartOfAppLocalDate(year: number, month: number, day: number) {
  return buildDateInAppTimeZone({
    year,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

function addDaysToAppLocalDate(parts: { year: number; month: number; day: number }, days: number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getExpectedWeekday(obligation: { jourSemaine?: string | null; dateDebut?: Date | null }) {
  const normalizedDay = normalizeScheduleValue(obligation.jourSemaine);
  if (normalizedDay && DAY_NAME_TO_INDEX.has(normalizedDay)) {
    return DAY_NAME_TO_INDEX.get(normalizedDay) ?? null;
  }

  return obligation.dateDebut ? getAppDayIndex(obligation.dateDebut) : null;
}

function getPointageSchedule(
  obligation: { frequence?: string | null; jourSemaine?: string | null; dateDebut?: Date | null },
  today: Date,
) {
  const frequency = normalizeScheduleValue(obligation.frequence);
  const todayParts = getTimeZoneDateParts(today);
  const todayDayIndex = getAppDayIndex(today);

  if (frequency === "HEBDOMADAIRE") {
    const expectedDayIndex = getExpectedWeekday(obligation);
    if (expectedDayIndex !== null && todayDayIndex !== expectedDayIndex) {
      return null;
    }

    const weekStartParts = addDaysToAppLocalDate(todayParts, -((todayDayIndex + 6) % 7));
    const weekEndParts = addDaysToAppLocalDate(weekStartParts, 7);

    return {
      periodStart: buildStartOfAppLocalDate(weekStartParts.year, weekStartParts.month, weekStartParts.day),
      periodEnd: buildStartOfAppLocalDate(weekEndParts.year, weekEndParts.month, weekEndParts.day),
    };
  }

  if (frequency === "MENSUEL") {
    const expectedDayOfMonth = obligation.dateDebut
      ? Math.min(
          getAppDayOfMonth(obligation.dateDebut),
          getDaysInAppMonth(todayParts.year, todayParts.month),
        )
      : 1;

    if (todayParts.day !== expectedDayOfMonth) {
      return null;
    }

    return {
      periodStart: buildStartOfAppLocalDate(todayParts.year, todayParts.month, 1),
      periodEnd:
        todayParts.month === 12
          ? buildStartOfAppLocalDate(todayParts.year + 1, 1, 1)
          : buildStartOfAppLocalDate(todayParts.year, todayParts.month + 1, 1),
    };
  }

  if (frequency === "PONCTUEL") {
    if (!obligation.dateDebut) {
      return null;
    }

    const expectedParts = getTimeZoneDateParts(obligation.dateDebut);
    if (
      todayParts.year !== expectedParts.year ||
      todayParts.month !== expectedParts.month ||
      todayParts.day !== expectedParts.day
    ) {
      return null;
    }
  }

  return {
    periodStart: today,
    periodEnd: new Date(today.getTime() + 24 * 60 * 60 * 1000),
  };
}

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
    const schedule = getPointageSchedule(obligation, today);
    if (!schedule) {
      continue;
    }

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

    const existingValidPointage = await prisma.pointage.findFirst({
      where: {
        obligationId: obligation.id,
        dateHeure: {
          gte: schedule.periodStart,
          lt: schedule.periodEnd,
        },
        statut: "VALIDE",
      },
    });

    if (existingValidPointage) continue;

    const existingAbsentPointage = await prisma.pointage.findFirst({
      where: {
        obligationId: obligation.id,
        dateHeure: {
          gte: schedule.periodStart,
          lt: schedule.periodEnd,
        },
        statut: "ABSENT",
        source: "SYSTEME",
      },
    });

    if (existingAbsentPointage) continue;

    // Create absent pointage
    let absentPointage;
    try {
      absentPointage = await prisma.pointage.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }

      throw error;
    }

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
