import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import { LoginSchema } from "../schemas/auth.schema";
import {
  authenticateUser,
  serializeAuthenticatedUser,
  signAuthToken,
} from "../auth/auth.service";
import { clearLoginFailures, markLoginFailure } from "../auth/auth.middleware";
import { clearAuthCookie, setAuthCookie } from "../auth/auth-cookie";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, motDePasse } = LoginSchema.parse(req.body);
    const user = await authenticateUser(email, motDePasse);
    const token = signAuthToken(user);
    await clearLoginFailures(req);
    setAuthCookie(res, token);

    res.status(200).json({
      message: "Connexion reussie",
      data: {
        user: serializeAuthenticatedUser(user),
      },
    });
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 401) {
      await markLoginFailure(req);
    }
    next(error);
  }
}

export async function logoutController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    clearAuthCookie(res);
    res.status(200).json({
      message: "Déconnexion réussie",
      data: {
        ok: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    res.status(200).json({
      message: "Utilisateur courant recupere avec succes",
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
}
