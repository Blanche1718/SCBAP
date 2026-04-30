import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  getAlertesSurveillance,
  markAlertAsProcessed,
} from "../services/alertes-surveillance.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, `Identifiant de ${label} invalide`);
  }

  return value;
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

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "Le parametre de filtre est invalide");
  }

  return value.trim() || undefined;
}

export async function getAlertesSurveillanceController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parsePaginationParam(req.query.page, "page", 1);
    const limit = parsePaginationParam(req.query.limit, "limit", 10);
    const search = parseOptionalString(req.query.search);
    const type = parseOptionalString(req.query.type);
    const niveau = parseOptionalString(req.query.niveau);
    const statut = parseOptionalString(req.query.statut);
    const jurisdiction = parseOptionalString(req.query.juridiction);

    const alertes = await getAlertesSurveillance(
      page,
      limit,
      {
        search,
        type,
        niveau,
        statut,
        jurisdiction,
      },
      req.user,
    );

    res.status(200).json({
      message: "Liste des alertes recuperee avec succes",
      data: alertes,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAlertAsProcessedController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "alerte");
    const alert = await markAlertAsProcessed(id, req.user);

    res.status(200).json({
      message: "Alerte marquée comme traitee",
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}
