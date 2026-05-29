import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createCategorieObligation,
  deleteCategorieObligation,
  getCategorieObligationById,
  getCategoriesObligation,
  updateCategorieObligation,
} from "../services/categorie-obligation.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCategoryId(value: unknown) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, "Identifiant de categorie invalide");
  }

  return value;
}

export async function getCategoriesObligationController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await getCategoriesObligation();

    res.status(200).json({
      message: "Liste des categories recuperee avec succes",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategorieObligationByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseCategoryId(req.params.id);
    const category = await getCategorieObligationById(id);

    res.status(200).json({
      message: "Categorie recuperee avec succes",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategorieObligationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const category = await createCategorieObligation(req.body);

    res.status(201).json({
      message: "Categorie creee avec succes",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategorieObligationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseCategoryId(req.params.id);
    const category = await updateCategorieObligation(id, req.body);

    res.status(200).json({
      message: "Categorie mise a jour avec succes",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategorieObligationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseCategoryId(req.params.id);
    const category = await deleteCategorieObligation(id);

    res.status(200).json({
      message: "Categorie supprimee avec succes",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}
