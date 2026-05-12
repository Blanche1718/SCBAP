import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  confirmBeneficiaireProfil,
  getBeneficiaireById,
  getBeneficiaires,
  updateBeneficiaire,
  syncSpecificObligationsForBeneficiaire,
} from "../services/beneficiaire.service";
import { listBeneficiaireEvaluations } from "../services/portail.service";

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

function parseObligationsPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Payload invalide");
  }

  const raw = body as {
    obligations?: unknown;
  };

  if (!Array.isArray(raw.obligations)) {
    throw new HttpError(400, "La liste des obligations est requise");
  }

  return raw.obligations as Array<{
    categorie?: unknown;
    libelle?: unknown;
    code?: unknown;
    section?: unknown;
    type?: unknown;
    frequence?: unknown;
    jourSemaine?: unknown;
    heure?: unknown;
    lieu?: unknown;
  }>;
}

function parseCategorieValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object") {
    const categorie = value as {
      nom?: unknown;
      label?: unknown;
      code?: unknown;
      section?: unknown;
    };

    const name = categorie.nom ?? categorie.label ?? categorie.code ?? categorie.section;
    if (typeof name === "string") {
      return name.trim();
    }
  }

  return "";
}

export async function getBeneficiairesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parsePaginationParam(req.query.page, "page", 1);
    const limit = parsePaginationParam(req.query.limit, "limit", 10);
    const beneficiaires = await getBeneficiaires(page, limit, req.user);

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
    const beneficiaire = await getBeneficiaireById(id, req.user);

    res.status(200).json({
      message: "Beneficiaire recupere avec succes",
      data: beneficiaire,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBeneficiaireEvaluationsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "beneficiaire");
    await getBeneficiaireById(id, req.user);
    const evaluations = await listBeneficiaireEvaluations(id);

    res.status(200).json({
      message: "Evaluations du beneficiaire recuperees avec succes",
      data: evaluations,
    });
  } catch (error) {
    next(error);
  }
}

export async function syncBeneficiaireObligationsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "beneficiaire");
    const obligations = parseObligationsPayload(req.body).map((item) => ({
      categorie: parseCategorieValue(item.categorie),
      libelle: String(item.libelle ?? "").trim(),
      code: item.code === undefined || item.code === null ? undefined : String(item.code),
      section: item.section === undefined || item.section === null ? undefined : String(item.section),
      type: item.type === undefined || item.type === null ? undefined : String(item.type),
      frequence: item.frequence === undefined || item.frequence === null ? undefined : String(item.frequence),
      jourSemaine: item.jourSemaine === undefined || item.jourSemaine === null ? undefined : String(item.jourSemaine),
      heure: item.heure === undefined || item.heure === null ? undefined : String(item.heure),
      lieu: item.lieu === undefined || item.lieu === null ? undefined : String(item.lieu),
    })).filter((item) => item.categorie && item.libelle);

    const created = await syncSpecificObligationsForBeneficiaire(id, obligations, req.user);

    res.status(200).json({
      message: "Obligations specifiques synchronisees avec succes",
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmBeneficiaireProfilController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "beneficiaire");
    const beneficiaire = await confirmBeneficiaireProfil(id, req.user);

    res.status(200).json({
      message: "Profil beneficiaire confirme avec succes",
      data: beneficiaire,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBeneficiaireController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "beneficiaire");
    const beneficiaire = await updateBeneficiaire(id, req.body);

    res.status(200).json({
      message: "Beneficiaire mis a jour avec succes",
      data: beneficiaire,
    });
  } catch (error) {
    next(error);
  }
}
