import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createCategorieObligation,
  deleteCategorieObligation,
  getCategorieObligationById,
  getCategoriesObligation,
  updateCategorieObligation,
} from "../services/categorie-obligation.service";

function parseCategoryId(value: unknown) {
  if (typeof value !== "string") {
    throw new HttpError(400, "Identifiant de categorie invalide");
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Identifiant de categorie invalide");
  }

  return id;
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
