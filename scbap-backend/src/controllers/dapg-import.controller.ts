import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  syncAllDapgLiberationConditionnelles,
  syncDapgLiberationConditionnelle,
} from "../services/dapg-import.service";

function parseExternalId(idParam: string | string[] | undefined) {
  if (typeof idParam !== "string" || !idParam.trim()) {
    throw new HttpError(400, "Identifiant DAPG invalide");
  }

  return idParam.trim();
}

export async function syncDapgLiberationConditionnelleController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dapgId = parseExternalId(req.params.dapgId);
    const dossier = await syncDapgLiberationConditionnelle(dapgId);

    res.status(200).json({
      message: "Dossier DAPG synchronise avec succes",
      data: dossier,
    });
  } catch (error) {
    next(error);
    console.error("Erreur lors de la synchronisation DAPG:", error);
  }
}

export async function syncAllDapgLiberationConditionnellesController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await syncAllDapgLiberationConditionnelles();

    res.status(200).json({
      message: "Synchronisation DAPG terminee",
      data: result,
    });
  } catch (error) {
    next(error);
    console.error("Erreur lors de la synchronisation DAPG globale:", error);
  }
}
