import type { AuthenticatedUser } from "../auth/auth.types";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getUserJuridictionCode } from "../utils/juridiction";

export interface StatutGlobal {
  totalBeneficiaires: number;
  actifs: number;
  aConfigurer: number;
  alertesCritiques: number;
  rapportsEnAttente: number;
  variationActifs: number;
}

export interface EvenementTempsReel {
  id: string;
  beneficiaireCode: string;
  beneficiaireNom: string;
  message: string;
  heure: string;
  priorite: "CRITIQUE" | "MAINTENANCE" | "INFO";
}

export interface PointCompliance {
  jour: string;
  taux: number;
}

export interface PointComplianceTrend {
  jour: string;
  label: string;
  taux: number;
  total: number;
  valides: number;
}

type DashboardAccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

type DashboardScope = {
  jurisdictionId?: string;
};

function isAdminAccess(user?: DashboardAccessContext) {
  return user?.role?.nom === "ADMIN";
}

function resolveDashboardScope(
  user?: DashboardAccessContext,
  requestedJurisdiction?: string | null,
): DashboardScope {
  if (!isAdminAccess(user)) {
    return {
      jurisdictionId: getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__",
    };
  }

  const jurisdictionId = getUserJuridictionCode(requestedJurisdiction);

  return {
    jurisdictionId: jurisdictionId || undefined,
  };
}

function buildDossierScopeWhere(scope: DashboardScope): Prisma.DossierWhereInput {
  return {
    deletedAt: null,
    ...(scope.jurisdictionId ? { juridictionId: scope.jurisdictionId } : {}),
  };
}

function buildBeneficiaireScopeWhere(scope: DashboardScope): Prisma.BeneficiaireWhereInput {
  return {
    dossier: {
      is: buildDossierScopeWhere(scope),
    },
  };
}

function buildPointageScopeWhere(scope: DashboardScope): Prisma.PointageWhereInput {
  return {
    beneficiaire: {
      is: buildBeneficiaireScopeWhere(scope),
    },
  };
}

function buildAlerteScopeWhere(scope: DashboardScope): Prisma.AlerteWhereInput {
  return {
    beneficiaire: {
      is: buildBeneficiaireScopeWhere(scope),
    },
  };
}

function buildDocumentScopeWhere(scope: DashboardScope): Prisma.DocumentWhereInput {
  return {
    dossier: {
      is: buildDossierScopeWhere(scope),
    },
  };
}

/*
async function countActifsAt(date: Date, scope: DashboardScope) {
  const beneficiaires = await prisma.beneficiaire.findMany({
    where: {
      ...buildBeneficiaireScopeWhere(scope),
      createdAt: { lte: date },
    },
    select: {
      profilStatut: true,
      profilConfirme: true,
      historiquesStatut: {
        where: {
          date: { lte: date },
        },
        orderBy: {
          date: "desc",
        },
        take: 1,
        select: {
          nouveauStatut: true,
        },
      },
    },
  });

  return beneficiaires.filter((b) => {
    const statutAdate =
      b.historiquesStatut[0]?.nouveauStatut ??
      b.profilStatut ??
      (b.profilConfirme ? "ACTIF" : "A_CONFIGURER");
    return statutAdate === "ACTIF";
  }).length;
}
*/

async function countActifsAt(date: Date, scope: DashboardScope) {
  const beneficiaires = await prisma.beneficiaire.findMany({
    where: {
      ...buildBeneficiaireScopeWhere(scope),
      createdAt: { lte: date },
    },
    select: {
      profilStatut: true,
      profilConfirme: true,
      historiquesStatut: {
        where: {
          date: { lte: date },
        },
        orderBy: {
          date: "desc",
        },
        take: 1,
        select: {
          nouveauStatut: true,
        },
      },
    },
  });

  return beneficiaires.filter((b) => {
    const statutAdate =
      b.historiquesStatut[0]?.nouveauStatut ??
      b.profilStatut ??
      (b.profilConfirme ? "ACTIF" : "A_CONFIGURER");
    return statutAdate === "ACTIF";
  }).length;
}

export async function getDashboardStats(
  user?: DashboardAccessContext,
  requestedJurisdiction?: string | null,
): Promise<StatutGlobal> {
  const scope = resolveDashboardScope(user, requestedJurisdiction);
  const now = new Date();
  const previousPeriod = new Date(now);
  previousPeriod.setDate(previousPeriod.getDate() - 7);

  const [totalBeneficiaires, actifs, aconfigurer, alertes, rapports, actifsPrecedents] =
    await Promise.all([
      prisma.beneficiaire.count({
        where: buildBeneficiaireScopeWhere(scope),
      }),
      prisma.beneficiaire.count({
        where: {
          ...buildBeneficiaireScopeWhere(scope),
          profilStatut: "ACTIF",
        },
      }),
      prisma.beneficiaire.count({
        where: {
          ...buildBeneficiaireScopeWhere(scope),
          profilStatut: "A_CONFIGURER",
        },
      }),
      prisma.alerte.count({
        where: {
          ...buildAlerteScopeWhere(scope),
          niveau: "CRITIQUE",
          statut: "OUVERT",
        },
      }),
      prisma.document.count({
        where: {
          ...buildDocumentScopeWhere(scope),
          statut: "EN_ATTENTE",
        },
      }),
      countActifsAt(previousPeriod, scope),
    ]);

  return {
    totalBeneficiaires,
    actifs,
    aConfigurer: aconfigurer,
    alertesCritiques: alertes,
    rapportsEnAttente: rapports,
    variationActifs: actifs - actifsPrecedents,
  };
}


export async function getRecentEvents(
  user?: DashboardAccessContext,
  requestedJurisdiction?: string | null,
): Promise<EvenementTempsReel[]> {
  const scope = resolveDashboardScope(user, requestedJurisdiction);
  const pointages = await prisma.pointage.findMany({
    take: 3,
    orderBy: { dateHeure: "desc" },
    where: buildPointageScopeWhere(scope),
    include: {
      beneficiaire: {
        include: { dossier: true },
      },
    },
  });

  const alertes = await prisma.alerte.findMany({
    take: 2,
    orderBy: { createdAt: "desc" },
    where: buildAlerteScopeWhere(scope),
  });

  const events: EvenementTempsReel[] = [];

  pointages.forEach((p) => {
    const nom = p.beneficiaire?.dossier?.prenom || "Inconnu";
    const code = p.beneficiaire?.dossier?.numeroDossier || "BENE-00000";
    events.push({
      id: p.id,
      beneficiaireCode: code,
      beneficiaireNom: nom,
      message:
        p.statut === "ABSENT"
          ? `Absence de pointage détectée — ${p.lieu ?? "Lieu inconnu"}`
          : `Pointage enregistré — ${p.lieu ?? "Lieu inconnu"}`,
      heure: new Date(p.dateHeure).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      priorite: p.statut === "ABSENT" ? "CRITIQUE" : "INFO",
    });
  });

  alertes.forEach((a) => {
    events.push({
      id: a.id,
      beneficiaireCode: "ALERTE",
      beneficiaireNom: "Système",
      message: a.message,
      heure: new Date(a.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      priorite: a.niveau === "CRITIQUE" ? "CRITIQUE" : "MAINTENANCE",
    });
  });

  return events.sort((a, b) => b.heure.localeCompare(a.heure)).slice(0, 5);
}

export async function getComplianceByWeek(
  user?: DashboardAccessContext,
  requestedJurisdiction?: string | null,
): Promise<PointCompliance[]> {
  const scope = resolveDashboardScope(user, requestedJurisdiction);
  /*
  Ancienne logique: pourcentage de pointage calculé seulement sur la semaine courante.
  Utile si on veut réactiver un mode "Semaine en cours" plus tard.

  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const jours = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
  const compliance: PointCompliance[] = [];

  for (let i = 0; i < 7; i++) {
    const jour = new Date(monday);
    jour.setDate(monday.getDate() + i);
    jour.setHours(0, 0, 0, 0);

    const nextDay = new Date(jour);
    nextDay.setDate(jour.getDate() + 1);

    const totalPointages = await prisma.pointage.count({
      where: {
        dateHeure: { gte: jour, lt: nextDay },
      },
    });

    const validesPointages = await prisma.pointage.count({
      where: {
        dateHeure: { gte: jour, lt: nextDay },
        statut: "VALIDE",
      },
    });

    const taux = totalPointages === 0 ? 0 : Math.round((validesPointages / totalPointages) * 100);

    compliance.push({
      jour: jours[i],
      taux: taux,
    });
  }

  return compliance;
  */

  const jours = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
  const counts = jours.map(() => ({ total: 0, valides: 0 }));

  const pointages = await prisma.pointage.findMany({
    where: buildPointageScopeWhere(scope),
    select: {
      dateHeure: true,
      statut: true,
    },
  });

  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Africa/Porto-Novo",
  });

  const weekdayToIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  for (const pointage of pointages) {
    const weekday = weekdayFormatter.format(pointage.dateHeure);
    const index = weekdayToIndex[weekday];

    if (index === undefined) {
      continue;
    }

    counts[index].total += 1;
    if (pointage.statut === "VALIDE") {
      counts[index].valides += 1;
    }
  }

  return jours.map((jour, index) => {
    const { total, valides } = counts[index];
    const taux = total === 0 ? 0 : Math.round((valides / total) * 100);

    return {
      jour,
      taux,
    };
  });
}

export async function getComplianceTrend30Days(
  user?: DashboardAccessContext,
  requestedJurisdiction?: string | null,
): Promise<PointComplianceTrend[]> {
  const scope = resolveDashboardScope(user, requestedJurisdiction);
  const formatterKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Porto-Novo",
  });
  const formatterLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit",
    month: "short",
  });

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const pointsByDay = new Map<
    string,
    { jour: string; total: number; valides: number }
  >();

  for (let i = 0; i < 30; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = formatterKey.format(day);
    pointsByDay.set(key, {
      jour: key,
      total: 0,
      valides: 0,
    });
  }

  const pointages = await prisma.pointage.findMany({
    where: buildPointageScopeWhere(scope),
    select: {
      dateHeure: true,
      statut: true,
    },
  });

  for (const pointage of pointages) {
    const key = formatterKey.format(pointage.dateHeure);
    const bucket = pointsByDay.get(key);

    if (!bucket) {
      continue;
    }

    bucket.total += 1;
    if (pointage.statut === "VALIDE") {
      bucket.valides += 1;
    }
  }

  return Array.from(pointsByDay.values()).map((bucket) => {
    const day = new Date(bucket.jour);
    const taux = bucket.total === 0 ? 0 : Math.round((bucket.valides / bucket.total) * 100);

    return {
      jour: formatterLabel.format(day),
      label: bucket.jour,
      taux,
      total: bucket.total,
      valides: bucket.valides,
    };
  });
}
