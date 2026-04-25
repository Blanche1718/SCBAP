import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  getCurrentUser,
  getUsers,
  getUsersMeta,
  resetUserPassword,
  updateOwnPassword,
  updateOwnProfile,
  updateUserByAdmin,
} from "../services/user.service";
import {
  UpdateOwnPasswordSchema,
  UpdateOwnProfileSchema,
  UpdateUserAdminSchema,
} from "../schemas/user.schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUserId(idParam: string | string[] | undefined) {
  if (typeof idParam !== "string" || !UUID_REGEX.test(idParam)) {
    throw new HttpError(400, "Identifiant utilisateur invalide");
  }

  return idParam;
}

export async function getUsersController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const users = await getUsers();
    res.status(200).json({
      message: "Liste des utilisateurs recuperee avec succes",
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsersMetaController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const meta = await getUsersMeta();
    res.status(200).json({
      message: "Metadonnees utilisateurs recuperees avec succes",
      data: meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserByAdminController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUserId(req.params.id);
    const input = UpdateUserAdminSchema.parse(req.body);
    const user = await updateUserByAdmin(id, input);

    res.status(200).json({
      message: "Utilisateur mis a jour avec succes",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetUserPasswordController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUserId(req.params.id);
    const result = await resetUserPassword(id);

    res.status(200).json({
      message: "Mot de passe reinitialise avec succes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUserController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    const user = await getCurrentUser(req.user.id);

    res.status(200).json({
      message: "Utilisateur courant recupere avec succes",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOwnProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    const input = UpdateOwnProfileSchema.parse(req.body);
    const user = await updateOwnProfile(req.user.id, input);

    res.status(200).json({
      message: "Profil mis a jour avec succes",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOwnPasswordController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    const input = UpdateOwnPasswordSchema.parse(req.body);
    const result = await updateOwnPassword(req.user.id, input);

    res.status(200).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
