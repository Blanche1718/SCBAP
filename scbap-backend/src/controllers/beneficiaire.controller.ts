import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  getBeneficiaireById,
  getBeneficiaires,
} from "../services/beneficiaire.service";

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

export async function getBeneficiairesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parsePaginationParam(req.query.page, "page", 1);
    const limit = parsePaginationParam(req.query.limit, "limit", 10);
    const beneficiaires = await getBeneficiaires(page, limit);

    res.status(200).json({
      message: "Liste des beneficiaires recuperee avec succes",
      data: beneficiaires,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBeneficiaireByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "beneficiaire");
    const beneficiaire = await getBeneficiaireById(id);

    res.status(200).json({
      message: "Beneficiaire recupere avec succes",
      data: beneficiaire,
    });
  } catch (error) {
    next(error);
  }
}
