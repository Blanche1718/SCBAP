import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  syncAllDapgLiberationConditionnelles,
  syncDapgLiberationConditionnelle,
} from "../services/dapg-import.service";
import { checkDapgConnection } from "../integrations/dapg/client";

function parseExternalId(idParam: string | string[] | undefined) {
  if (typeof idParam !== "string" || !idParam.trim()) {
    throw new HttpError(400, "Identifiant DAPG invalide");
  }

  return idParam.trim();
}

function forwardDapgError(error: unknown, next: NextFunction) {
  if (error instanceof Error && error.message.includes("API DAPG injoignable")) {
    next(new HttpError(502, error.message));
    return;
  }

  next(error);
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
    forwardDapgError(error, next);
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
    forwardDapgError(error, next);
  }
}

export async function checkDapgConnectionController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await checkDapgConnection();
    res.status(result.ok ? 200 : 502).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
