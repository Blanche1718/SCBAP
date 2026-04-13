import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createObligation,
  getObligationById,
  getObligationsByDossier,
  updateObligation,
  validateObligation,
} from "../services/obligation.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, `Identifiant de ${label} invalide`);
  }

  return value;
}

export async function getObligationsByDossierController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dossierId = parseUuid(req.params.dossierId, "dossier");
    const obligations = await getObligationsByDossier(dossierId);

    res.status(200).json({
      message: "Liste des obligations recuperee avec succes",
      data: obligations,
    });
  } catch (error) {
    next(error);
  }
}

export async function createObligationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dossierId = parseUuid(req.params.dossierId, "dossier");
    const obligation = await createObligation(dossierId, req.body);

    res.status(201).json({
      message: "Obligation creee avec succes",
      data: obligation,
    });
  } catch (error) {
    next(error);
  }
}

export async function getObligationByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "obligation");
    const obligation = await getObligationById(id);

    res.status(200).json({
      message: "Obligation recuperee avec succes",
      data: obligation,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateObligationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "obligation");
    const obligation = await updateObligation(id, req.body);

    res.status(200).json({
      message: "Obligation mise a jour avec succes",
      data: obligation,
    });
  } catch (error) {
    next(error);
  }
}

export async function validateObligationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "obligation");
    const obligation = await validateObligation(id, req.body);

    res.status(200).json({
      message: "Obligation validee avec succes",
      data: obligation,
    });
  } catch (error) {
    next(error);
  }
}
