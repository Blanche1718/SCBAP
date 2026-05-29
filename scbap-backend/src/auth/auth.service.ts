import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import prisma from "../prisma";
import { HttpError } from "../errorHandler";
import type { AuthenticatedUser, AuthUserRecord, JwtAuthPayload } from "./auth.types";

function getJwtSecret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) {
    throw new Error("JWT_SECRET est manquant dans l'environnement");
  }

  if (value.length < 32 || value.startsWith("change-me")) {
    throw new Error("JWT_SECRET doit contenir au moins 32 caracteres aleatoires");
  }

  return value;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || "10");

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

function mapUser(user: AuthUserRecord): AuthenticatedUser {
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

async function loadUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      structure: true,
    },
  });
}

export function signAuthToken(user: AuthUserRecord) {
  const payload: JwtAuthPayload = {
    sub: user.id,
    email: user.email,
    role: user.role.nom,
    structureId: user.structureId,
    sessionVersion: user.sessionVersion,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtAuthPayload;
}

export async function getAuthenticatedUserById(id: string, expectedSessionVersion?: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      structure: true,
    },
  });

  if (!user) {
    throw new HttpError(401, "Session invalide");
  }

  if (user.statut !== "ACTIF") {
    throw new HttpError(403, "Compte inactif");
  }

  if (
    expectedSessionVersion !== undefined &&
    user.sessionVersion !== expectedSessionVersion
  ) {
    throw new HttpError(401, "Session expirée, veuillez vous reconnecter");
  }

  return user;
}

export async function authenticateUser(email: string, motDePasse: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await loadUserByEmail(normalizedEmail);

  if (!user) {
    throw new HttpError(401, "Identifiants invalides");
  }

  if (user.statut !== "ACTIF") {
    throw new HttpError(403, "Compte inactif");
  }

  const storedPassword = user.motDePasse.trim();
  const passwordMatches = isBcryptHash(storedPassword)
    ? await bcrypt.compare(motDePasse, storedPassword)
    : storedPassword === motDePasse;

  if (!passwordMatches) {
    throw new HttpError(401, "Identifiants invalides");
  }

  if (!isBcryptHash(storedPassword)) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        motDePasse: await bcrypt.hash(motDePasse, BCRYPT_ROUNDS),
      },
    });
  }

  return user;
}

export function serializeAuthenticatedUser(user: AuthUserRecord): AuthenticatedUser {
  return mapUser(user);
}
