import { Prisma } from "@prisma/client";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";

type PointageFilters = {
  search?: string;
  statut?: string;
  date?: string;
  lieu?: string;
  type?: string;
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
