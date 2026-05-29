import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import { getAuthenticatedUserById, verifyAuthToken } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";
import { getAuthCookieToken } from "./auth-cookie";
import {
  clearLoginFailureCount,
  getLoginFailureCount,
  incrementLoginFailureCount,
} from "../services/login-rate-limit.service";
import { logger } from "../logger";

const LOGIN_RATE_LIMIT_WINDOW_MS = Number(
  process.env.LOGIN_RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`,
);
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || "5",
);
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = Math.ceil(LOGIN_RATE_LIMIT_WINDOW_MS / 1000);

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
  void (async () => {
    const key = getLoginAttemptKey(req);
    try {
      const redisCount = await getLoginFailureCount(key);
      if (redisCount !== null) {
        if (redisCount >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
          throw new HttpError(
            429,
            "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
          );
        }

        res.locals.loginAttemptKey = key;
        next();
        return;
      }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (process.env.NODE_ENV === "production") {
        throw error;
      }

      logger.warn("Login rate limiter Redis lookup failed", { error });
    }

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
  })().catch(next);
}

export async function markLoginFailure(req: Request) {
  const key = resLocalsLoginAttemptKey(req) ?? getLoginAttemptKey(req);
  try {
    const redisCount = await incrementLoginFailureCount(key, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
    if (redisCount !== null) {
      return;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    logger.warn("Login rate limiter Redis increment failed", { error });
  }

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

export async function clearLoginFailures(req: Request) {
  const key = resLocalsLoginAttemptKey(req) ?? getLoginAttemptKey(req);
  try {
    const cleared = await clearLoginFailureCount(key);
    if (cleared) {
      return;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    logger.warn("Login rate limiter Redis clear failed", { error });
  }

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
