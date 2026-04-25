import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import { LoginSchema } from "../schemas/auth.schema";
import {
  authenticateUser,
  serializeAuthenticatedUser,
  signAuthToken,
} from "../auth/auth.service";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, motDePasse } = LoginSchema.parse(req.body);
    const user = await authenticateUser(email, motDePasse);
    const token = signAuthToken(user);

    res.status(200).json({
      message: "Connexion reussie",
      data: {
        token,
        user: serializeAuthenticatedUser(user),
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
