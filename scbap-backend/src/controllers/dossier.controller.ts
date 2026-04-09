import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createDossier,
  getDossierById,
  getDossiers,
} from "../services/dossier.service";

function parseDossierId(idParam: string | string[] | undefined) {
  if (typeof idParam !== "string") {
    throw new HttpError(400, "Identifiant de dossier invalide");
  }

  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Identifiant de dossier invalide");
  }

  return id;
}

export async function createDossierController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dossier = await createDossier(req.body);

    res.status(201).json({
      message: "Dossier cree avec succes",
      data: dossier,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDossiersController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dossiers = await getDossiers();

    res.status(200).json({
      message: "Liste des dossiers recuperee avec succes",
      data: dossiers,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDossierByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseDossierId(req.params.id);
    const dossier = await getDossierById(id);

    res.status(200).json({
      message: "Dossier recupere avec succes",
      data: dossier,
    });
  } catch (error) {
    next(error);
  }
}
