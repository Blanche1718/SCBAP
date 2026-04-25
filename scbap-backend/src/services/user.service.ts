import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { HttpError } from "../errorHandler";
import type { AuthenticatedUser } from "../auth/auth.types";
import { serializeAuthenticatedUser } from "../auth/auth.service";
import type {
  UpdateOwnPasswordInput,
  UpdateOwnProfileInput,
  UpdateUserAdminInput,
} from "../schemas/user.schema";

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "change_me";

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

type UserWithRelations = Awaited<
  Prisma.UserGetPayload<{
    include: {
      role: true;
      structure: true;
    };
  }>
>;

async function assertUniqueEmail(email: string, ignoreId?: string) {
  const existing = await prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
  });

  if (existing) {
    throw new HttpError(409, "Cet email est deja utilise");
  }
}

function mapUser(user: UserWithRelations) {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    statut: user.statut,
    createdAt: user.createdAt.toISOString(),
    role: {
      id: user.role.id,
      nom: user.role.nom,
    },
    structure: {
      id: user.structure.id,
      nom: user.structure.nom,
      code: user.structure.code,
      type: user.structure.type,
      juridiction: user.structure.juridiction,
    },
  };
}

export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { nom: "asc" }, { prenom: "asc" }],
    include: {
      role: true,
      structure: true,
    },
  });

  return users.map((user) => mapUser(user));
}

export async function getUsersMeta() {
  const [roles, structures] = await Promise.all([
    prisma.role.findMany({
      orderBy: { nom: "asc" },
    }),
    prisma.structure.findMany({
      orderBy: { nom: "asc" },
    }),
  ]);

  return { roles, structures };
}

export async function updateUserByAdmin(userId: string, input: UpdateUserAdminInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  if (input.email) {
    await assertUniqueEmail(input.email, userId);
  }

  const data: Prisma.UserUncheckedUpdateInput = {};

  if (input.nom !== undefined) {
    data.nom = input.nom.trim();
  }

  if (input.prenom !== undefined) {
    data.prenom = input.prenom.trim();
  }

  if (input.email !== undefined) {
    data.email = input.email.trim().toLowerCase();
  }

  if (input.telephone !== undefined) {
    data.telephone = input.telephone?.trim() || undefined;
  }

  if (input.statut !== undefined) {
    data.statut = input.statut;
  }

  if (input.roleId !== undefined) {
    data.roleId = input.roleId;
  }

  if (input.structureId !== undefined && input.structureId !== null) {
    data.structureId = input.structureId;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    include: {
      role: true,
      structure: true,
    },
  });

  return mapUser(updated);
}

export async function resetUserPassword(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      motDePasse: await bcrypt.hash(DEFAULT_PASSWORD, 10),
    },
  });

  return {
    password: DEFAULT_PASSWORD,
  };
}

export async function updateOwnProfile(userId: string, input: UpdateOwnProfileInput) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.nom !== undefined ? { nom: input.nom.trim() } : {}),
      ...(input.prenom !== undefined ? { prenom: input.prenom.trim() } : {}),
      ...(input.telephone !== undefined ? { telephone: input.telephone?.trim() || undefined } : {}),
    },
    include: {
      role: true,
      structure: true,
    },
  });

  return serializeAuthenticatedUser(updated);
}

export async function updateOwnPassword(userId: string, input: UpdateOwnPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  const storedPassword = user.motDePasse.trim();
  const passwordMatches = isBcryptHash(storedPassword)
    ? await bcrypt.compare(input.currentPassword, storedPassword)
    : storedPassword === input.currentPassword;

  if (!passwordMatches) {
    throw new HttpError(401, "Mot de passe actuel invalide");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      motDePasse: await bcrypt.hash(input.newPassword, 10),
    },
  });

  return { message: "Mot de passe mis a jour avec succes" };
}

export async function getCurrentUser(userId: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      structure: true,
    },
  });

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  return serializeAuthenticatedUser(user);
}
