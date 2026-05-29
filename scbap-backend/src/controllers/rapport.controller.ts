import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createPrefilledRapport,
  finalizeRapport,
  listDocumentsRecus,
  listEvaluationsRecues,
  listRapportsRediges,
  reopenRapportDraft,
  updateDraftRapport,
} from "../services/rapport.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRapportId(value: unknown) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, "Identifiant de rapport invalide");
  }

  return value;
}

export async function createPrefilledRapportController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rapport = await createPrefilledRapport(req.body, req.user);

    res.status(201).json({
      message: "Rapport pre-rempli cree avec succes",
      data: rapport,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRapportsRedigesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rapports = await listRapportsRediges(req.user);

    res.status(200).json({
      message: "Rapports rediges recuperes avec succes",
      data: rapports,
    });
  } catch (error) {
    next(error);
  }
}

export async function listEvaluationsRecuesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const evaluations = await listEvaluationsRecues(req.user);

    res.status(200).json({
      message: "Evaluations recues recuperees avec succes",
      data: evaluations,
    });
  } catch (error) {
    next(error);
  }
}

export async function listDocumentsRecusController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const documents = await listDocumentsRecus(req.user);

    res.status(200).json({
      message: "Documents recus recuperes avec succes",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDraftRapportController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rapport = await updateDraftRapport(parseRapportId(req.params.id), req.body, req.user);

    res.status(200).json({
      message: "Brouillon de rapport mis a jour avec succes",
      data: rapport,
    });
  } catch (error) {
    next(error);
  }
}

export async function finalizeRapportController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rapport = await finalizeRapport(parseRapportId(req.params.id), req.body, req.user);

    res.status(200).json({
      message: "Rapport finalise avec succes",
      data: rapport,
    });
  } catch (error) {
    next(error);
  }
}

export async function reopenRapportDraftController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rapport = await reopenRapportDraft(parseRapportId(req.params.id), req.user);

    res.status(200).json({
      message: "Rapport repasse en brouillon avec succes",
      data: rapport,
    });
  } catch (error) {
    next(error);
  }
}
