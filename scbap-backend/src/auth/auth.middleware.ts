import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import { getAuthenticatedUserById, verifyAuthToken } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";

function extractBearerToken(authorization?: string) {
  if (!authorization) {
    throw new HttpError(401, "Token manquant");
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Token invalide");
  }

  return token.trim();
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAuthToken(token);
    const user = await getAuthenticatedUserById(payload.sub);

    req.user = {
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
    } satisfies AuthenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Authentification requise");
      }

      if (!allowedRoles.includes(req.user.role.nom)) {
        throw new HttpError(403, "Acces refuse");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
