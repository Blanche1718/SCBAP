import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  getPortalSessionByAffectationId,
  verifyPortalAuthToken,
} from "./portal-auth.service";

function extractPortalBearerToken(authorization?: string) {
  if (!authorization) {
    throw new HttpError(401, "Token portail manquant");
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Token portail invalide");
  }

  return token.trim();
}

export async function requirePortalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = extractPortalBearerToken(req.headers.authorization);
    const payload = verifyPortalAuthToken(token);
    req.portalSession = await getPortalSessionByAffectationId(
      payload.affectationId,
    );
    next();
  } catch (error) {
    next(error);
  }
}
