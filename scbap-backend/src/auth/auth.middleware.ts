import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import { getAuthenticatedUserById, verifyAuthToken } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";
import { getAuthCookieToken } from "./auth-cookie";

const LOGIN_RATE_LIMIT_WINDOW_MS = Number(
  process.env.LOGIN_RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`,
);
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || "5",
);

type LoginAttemptState = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

const loginAttempts = new Map<string, LoginAttemptState>();

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

function extractAuthToken(req: Request) {
  const bearerToken = req.headers.authorization
    ? extractBearerToken(req.headers.authorization)
    : null;

  if (bearerToken) {
    return bearerToken;
  }

  const cookieToken = getAuthCookieToken(req);
  if (cookieToken) {
    return cookieToken;
  }

  throw new HttpError(401, "Token manquant");
}

function getLoginAttemptKey(req: Request) {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "__UNKNOWN__";
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  return `${ip}::${email}`;
}

function cleanupLoginAttempt(state: LoginAttemptState, now: number) {
  if (state.blockedUntil && state.blockedUntil <= now) {
    state.blockedUntil = null;
    state.count = 0;
    state.firstAttemptAt = now;
    return;
  }

  if (now - state.firstAttemptAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    state.count = 0;
    state.firstAttemptAt = now;
  }
}

export function requireLoginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const key = getLoginAttemptKey(req);
    const now = Date.now();
    const state = loginAttempts.get(key);

    if (state) {
      cleanupLoginAttempt(state, now);

      if (state.blockedUntil && state.blockedUntil > now) {
        throw new HttpError(
          429,
          "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
        );
      }
    }

    res.locals.loginAttemptKey = key;
    next();
  } catch (error) {
    next(error);
  }
}

export function markLoginFailure(req: Request) {
  const key = resLocalsLoginAttemptKey(req) ?? getLoginAttemptKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current) {
    loginAttempts.set(key, {
      count: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    });
    return;
  }

  cleanupLoginAttempt(current, now);
  current.count += 1;

  if (current.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    current.blockedUntil = now + LOGIN_RATE_LIMIT_WINDOW_MS;
  }

  loginAttempts.set(key, current);
}

export function clearLoginFailures(req: Request) {
  const key = resLocalsLoginAttemptKey(req) ?? getLoginAttemptKey(req);
  loginAttempts.delete(key);
}

function resLocalsLoginAttemptKey(req: Request) {
  const value = req.res?.locals?.loginAttemptKey;
  return typeof value === "string" ? value : null;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = extractAuthToken(req);
    const payload = verifyAuthToken(token);
    const user = await getAuthenticatedUserById(payload.sub, payload.sessionVersion);

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
