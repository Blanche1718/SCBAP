import type { AuthenticatedUser } from "../auth/auth.types";
import { HttpError } from "../errorHandler";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getUserJuridictionCode } from "../utils/juridiction";

type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

type AlertFilters = {
  search?: string;
  type?: string;
  niveau?: string;
  statut?: string;
  jurisdiction?: string;
};

type AlertSummary = {
  ouvertes: number;
  critiques: number;
  traiteesAujourdHui: number;
  beneficiairesTouches: number;
};

function isAdminAccess(user?: AccessContext) {
  return user?.role?.nom === "ADMIN";
}

function resolveJurisdiction(user?: AccessContext, requestedJurisdiction?: string | null) {
  if (!isAdminAccess(user)) {
    return getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__";
  }

  return getUserJuridictionCode(requestedJurisdiction) ?? undefined;
}

function buildDossierScopeWhere(jurisdictionId?: string) {
  return {
    deletedAt: null,
    ...(jurisdictionId ? { juridictionId: jurisdictionId } : {}),
  };
}

function buildAlertAccessFilter(user?: AccessContext, requestedJurisdiction?: string | null): Prisma.AlerteSurveillanceWhereInput {
  const jurisdictionId = resolveJurisdiction(user, requestedJurisdiction);

  return {
    beneficiaire: {
      is: {
        dossier: {
          is: buildDossierScopeWhere(jurisdictionId),
        },
      },
    },
  };
}

function buildAlertWhere(
  user?: AccessContext,
  filters: AlertFilters = {},
): Prisma.AlerteSurveillanceWhereInput {
  const and: Prisma.AlerteSurveillanceWhereInput[] = [buildAlertAccessFilter(user, filters.jurisdiction)];

  if (filters.type) {
    and.push({
      type: {
        contains: filters.type.trim(),
        mode: "insensitive",
      },
    });
  }

  if (filters.niveau) {
    and.push({
      niveau: filters.niveau.trim(),
    });
  }

  if (filters.statut) {
    and.push({
      statut: filters.statut.trim(),
    });
  }

  if (filters.search) {
    const query = filters.search.trim();
    and.push({
      OR: [
        {
          message: {
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
          source: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          beneficiaire: {
            is: {
              dossier: {
                is: {
                  deletedAt: null,
                  nom: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
        {
          beneficiaire: {
            is: {
              dossier: {
                is: {
                  deletedAt: null,
                  prenom: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
        {
          beneficiaire: {
            is: {
              dossier: {
                is: {
                  deletedAt: null,
                  numeroDossier: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
        {
          bracelet: {
            is: {
              codeImei: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  return { AND: and };
}

function buildBaseWhere(user?: AccessContext, requestedJurisdiction?: string | null) {
  return buildAlertAccessFilter(user, requestedJurisdiction);
}

function toStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function toEndOfDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toSummaryWhere(user?: AccessContext, requestedJurisdiction?: string | null) {
  return buildBaseWhere(user, requestedJurisdiction);
}

export async function getAlertesSurveillance(
  page = 1,
  limit = 10,
  filters: AlertFilters = {},
  user?: AccessContext,
) {
  if (page <= 0 || limit <= 0) {
    throw new HttpError(400, "Parametres de pagination invalides");
  }

  const where = buildAlertWhere(user, filters);
  const accessWhere = toSummaryWhere(user, filters.jurisdiction);
  const skip = (page - 1) * limit;

  const [alertes, total, ouvertes, critiques, traiteesAujourdHui, beneficiairesTouches] =
    await prisma.$transaction([
      prisma.alerteSurveillance.findMany({
        where,
        orderBy: { declencheeLe: "desc" },
        include: {
          beneficiaire: {
            include: {
              dossier: {
                include: {
                  juridiction: true,
                },
              },
            },
          },
          bracelet: true,
          regleSurveillance: true,
          positionGPS: true,
        },
        skip,
        take: limit,
      }),
      prisma.alerteSurveillance.count({ where }),
      prisma.alerteSurveillance.count({
        where: {
          ...accessWhere,
          statut: "OUVERTE",
        },
      }),
      prisma.alerteSurveillance.count({
        where: {
          ...accessWhere,
          niveau: "CRITIQUE",
        },
      }),
      prisma.alerteSurveillance.count({
        where: {
          ...accessWhere,
          resolueLe: {
            gte: toStartOfDay(),
            lte: toEndOfDay(),
          },
        },
      }),
      prisma.alerteSurveillance.groupBy({
        by: ["beneficiaireId"],
        where: accessWhere,
        _count: {
          beneficiaireId: true,
        },
      }),
    ]);

  const summary: AlertSummary = {
    ouvertes,
    critiques,
    traiteesAujourdHui,
    beneficiairesTouches: beneficiairesTouches.length,
  };

  return {
    data: alertes,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    },
  };
}

export async function markAlertAsProcessed(id: string, user?: AccessContext) {
  const alert = await prisma.alerteSurveillance.findFirst({
    where: {
      id,
      ...buildBaseWhere(user),
    },
  });

  if (!alert) {
    throw new HttpError(404, "Alerte introuvable");
  }

  return prisma.alerteSurveillance.update({
    where: { id },
    data: {
      statut: "TRAITEE",
      resolueLe: new Date(),
    },
    include: {
      beneficiaire: {
        include: {
          dossier: {
            include: {
              juridiction: true,
            },
          },
        },
      },
      bracelet: true,
      regleSurveillance: true,
      positionGPS: true,
    },
  });
}
