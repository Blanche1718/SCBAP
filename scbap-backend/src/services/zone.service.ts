import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import { getUserJuridictionCode } from "../utils/juridiction";
import {
  CreateZoneSchema,
  UpdateZoneSchema,
  type CreateZoneInput,
  type UpdateZoneInput,
} from "../schemas/zone.schema";

type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

function isAdminAccess(user?: AccessContext) {
  return user?.role?.nom === "ADMIN";
}

function buildBeneficiaireAccessWhere(user?: AccessContext) {
  if (isAdminAccess(user)) {
    return {
      dossier: {
        is: {
          deletedAt: null,
        },
      },
    };
  }

  const code = getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__";

  return {
    dossier: {
      is: {
        deletedAt: null,
        juridictionId: code,
      },
    },
  };
}

function resolveZoneGeometry(input: CreateZoneInput | UpdateZoneInput) {
  if (input.geometrie) {
    return input.geometrie;
  }

  if (input.polygons) {
    return input.polygons;
  }

  return undefined;
}

function toJsonGeometry(
  geometry?: ReturnType<typeof resolveZoneGeometry>,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (geometry === undefined) {
    return undefined;
  }

  if (geometry === null) {
    return Prisma.JsonNull;
  }

  return geometry as unknown as Prisma.InputJsonValue;
}

async function assertBeneficiaireAccess(beneficiaireId: string, user?: AccessContext) {
  return prisma.beneficiaire.findFirstOrThrow({
    where: {
      id: beneficiaireId,
      ...buildBeneficiaireAccessWhere(user),
    },
    select: {
      id: true,
    },
  });
}

async function assertZoneAccess(zoneId: string, user?: AccessContext) {
  const zone = await prisma.zone.findUniqueOrThrow({
    where: {
      id: zoneId,
    },
    include: {
      beneficiaire: {
        include: {
          dossier: true,
        },
      },
    },
  });

  await assertBeneficiaireAccess(zone.beneficiaireId, user);

  return zone;
}

export async function listBeneficiaireZones(beneficiaireId: string, user?: AccessContext) {
  await assertBeneficiaireAccess(beneficiaireId, user);

  return prisma.zone.findMany({
    where: { beneficiaireId },
    orderBy: [{ type: "asc" }, { nom: "asc" }],
  });
}

export async function createBeneficiaireZone(
  beneficiaireId: string,
  input: unknown,
  user?: AccessContext,
) {
  const data = CreateZoneSchema.parse(input);
  await assertBeneficiaireAccess(beneficiaireId, user);

  return prisma.zone.create({
    data: {
      beneficiaireId,
      nom: data.nom,
      type: data.type,
      geometrie: toJsonGeometry(resolveZoneGeometry(data)),
      rayon: data.rayon ?? null,
    },
  });
}

export async function updateZone(zoneId: string, input: unknown, user?: AccessContext) {
  const data = UpdateZoneSchema.parse(input);
  const zone = await assertZoneAccess(zoneId, user);

  return prisma.zone.update({
    where: { id: zone.id },
    data: {
      ...(data.nom !== undefined ? { nom: data.nom } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.geometrie !== undefined || data.polygons !== undefined
        ? { geometrie: toJsonGeometry(resolveZoneGeometry(data)) }
        : {}),
      ...(data.rayon !== undefined ? { rayon: data.rayon } : {}),
    },
  });
}

export async function deleteZone(zoneId: string, user?: AccessContext) {
  const zone = await assertZoneAccess(zoneId, user);

  await prisma.zone.delete({
    where: { id: zone.id },
  });

  return zone;
}
