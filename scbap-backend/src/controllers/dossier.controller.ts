import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createDossier,
  getDossierById,
  getDossiers,
  softDeleteDossier,
  updateDossier,
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

function parsePaginationParam(
  value: unknown,
  paramName: string,
  defaultValue: number,
) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `Le parametre "${paramName}" est invalide`);
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(
      400,
      `Le parametre "${paramName}" doit etre un entier positif`,
    );
  }

  return parsedValue;
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
    console.error("Erreur lors de la creation du dossier:", error);
  }
}

export async function getDossiersController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parsePaginationParam(req.query.page, "page", 1);
    const limit = parsePaginationParam(req.query.limit, "limit", 10);
    const dossiers = await getDossiers(page, limit);

    res.status(200).json({
      message: "Liste des dossiers recuperee avec succes",
      data: dossiers,
    });
  } catch (error) {
    next(error);
    console.error("Erreur lors de la recuperation des dossiers:", error);
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
    console.error("Erreur lors de la recuperation du dossier:", error);
  }
}

export async function updateDossierController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseDossierId(req.params.id);
    const dossier = await updateDossier(id, req.body);

    res.status(200).json({
      message: "Dossier mis a jour avec succes",
      data: dossier,
    });
  } catch (error) {
    next(error);
    console.error("Erreur lors de la mise a jour du dossier:", error);
  }
}

export async function softDeleteDossierController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseDossierId(req.params.id);
    const dossier = await softDeleteDossier(id);

    res.status(200).json({
      message: "Dossier supprime logiquement avec succes",
      data: dossier,
    });
  } catch (error) {
    next(error);
    console.error("Erreur lors de la suppression logique du dossier:", error);
  }
}
