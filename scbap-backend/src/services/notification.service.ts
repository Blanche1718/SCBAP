import type { AuthenticatedUser } from "../auth/auth.types";
import { HttpError } from "../errorHandler";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getUserJuridictionCode } from "../utils/juridiction";

type AccessContext = Pick<AuthenticatedUser, "role" | "structure" | "id"> | undefined;

type NotificationFilters = {
  search?: string;
  type?: string;
  priorite?: string;
  lu?: string;
  jurisdiction?: string;
};

type NotificationSummary = {
  total: number;
  unread: number;
  critiques: number;
  normales: number;
  infos: number;
};

type CreateNotificationInput = {
  userId?: string | null;
  beneficiaireId?: string | null;
  alerteId?: string | null;
  pointageId?: string | null;
  type: string;
  priorite?: string;
  targetType: string;
  targetId: string;
  canal?: string;
  message: string;
  statut?: string;
  lu?: boolean;
  metadata?: Prisma.InputJsonValue;
  dateEnvoi?: Date | null;
};

function isAdminAccess(user?: AccessContext) {
  return user?.role?.nom === "ADMIN";
}

function buildDossierScopeWhere(jurisdictionId?: string | null) {
  return {
    deletedAt: null,
    ...(jurisdictionId ? { juridictionId: jurisdictionId } : {}),
  };
}

function resolveJurisdiction(user?: AccessContext, requestedJurisdiction?: string | null) {
  if (isAdminAccess(user)) {
    return getUserJuridictionCode(requestedJurisdiction) ?? undefined;
  }

  return getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__";
}

function buildNotificationAccessFilter(
  user?: AccessContext,
  requestedJurisdiction?: string | null,
): Prisma.NotificationWhereInput {
  if (isAdminAccess(user)) {
    const jurisdictionId = resolveJurisdiction(user, requestedJurisdiction);

    if (!jurisdictionId) {
      return {};
    }

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

  const jurisdictionId = resolveJurisdiction(user, requestedJurisdiction);

  return {
    OR: [
      {
        beneficiaire: {
          is: {
            dossier: {
              is: buildDossierScopeWhere(jurisdictionId),
            },
          },
        },
      },
      ...(user?.id ? [{ userId: user.id }] : []),
    ],
  };
}

function buildNotificationWhere(
  user?: AccessContext,
  filters: NotificationFilters = {},
): Prisma.NotificationWhereInput {
  const and: Prisma.NotificationWhereInput[] = [buildNotificationAccessFilter(user, filters.jurisdiction)];

  if (filters.type) {
    and.push({
      type: {
        contains: filters.type.trim(),
        mode: "insensitive",
      },
    } as Prisma.NotificationWhereInput);
  }

  if (filters.priorite) {
    and.push({
      priorite: filters.priorite.trim(),
    } as Prisma.NotificationWhereInput);
  }

  if (filters.lu === "LUS") {
    and.push({ lu: true });
  } else if (filters.lu === "NON_LUS") {
    and.push({ lu: false });
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
          targetType: {
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
          alerte: {
            is: {
              type: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
        {
          targetId: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    } as Prisma.NotificationWhereInput);
  }

  return { AND: and };
}

function buildSummaryWhere(user?: AccessContext, requestedJurisdiction?: string | null) {
  return buildNotificationAccessFilter(user, requestedJurisdiction);
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId ?? null,
      beneficiaireId: input.beneficiaireId ?? null,
      alerteId: input.alerteId ?? null,
      pointageId: input.pointageId ?? null,
      type: input.type,
      priorite: input.priorite ?? "INFO",
      targetType: input.targetType,
      targetId: input.targetId,
      canal: input.canal ?? "INTERFACE",
      message: input.message,
      statut: input.statut ?? "ENVOYE",
      lu: input.lu ?? false,
      metadata: input.metadata ?? undefined,
      dateEnvoi: input.dateEnvoi ?? new Date(),
    },
  });

  return notification;
}

export async function getNotifications(
  page = 1,
  limit = 10,
  filters: NotificationFilters = {},
  user?: AccessContext,
) {
  if (page <= 0 || limit <= 0) {
    throw new HttpError(400, "Parametres de pagination invalides");
  }

  const where = buildNotificationWhere(user, filters);
  const accessWhere = buildSummaryWhere(user, filters.jurisdiction);
  const skip = (page - 1) * limit;

  const [notifications, total, unread, critiques, normales, infos] =
    await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: [
          { dateEnvoi: "desc" },
          { createdAt: "desc" },
        ] as Prisma.NotificationOrderByWithRelationInput[],
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
          alerte: true,
        },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          ...accessWhere,
          lu: false,
        },
      }),
      prisma.notification.count({
        where: {
          ...accessWhere,
          priorite: "CRITIQUE",
        },
      }),
      prisma.notification.count({
        where: {
          ...accessWhere,
          priorite: "NORMALE",
        },
      }),
      prisma.notification.count({
        where: {
          ...accessWhere,
          priorite: "INFO",
        },
      }),
    ]);

  const summary: NotificationSummary = {
    total,
    unread,
    critiques,
    normales,
    infos,
  };

  return {
    data: notifications,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    },
  };
}

export async function markNotificationAsRead(id: string, user?: AccessContext) {
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      ...buildNotificationAccessFilter(user, null),
    },
  });

  if (!notification) {
    throw new HttpError(404, "Notification introuvable");
  }

  return prisma.notification.update({
    where: { id },
    data: {
      lu: true,
    },
  });
}

export async function markAllNotificationsAsRead(
  filters: NotificationFilters = {},
  user?: AccessContext,
) {
  const where = buildNotificationWhere(user, filters);
  return prisma.notification.updateMany({
    where: {
      ...where,
      lu: false,
    },
    data: {
      lu: true,
    },
  });
}
