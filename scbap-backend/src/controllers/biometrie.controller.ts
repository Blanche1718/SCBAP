import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  BiometrieStatusSchema,
  StartBiometrieEnrolementSchema,
} from "../schemas/biometrie.schema";
import {
  getBiometrieEnrolementStatus,
  startBiometrieEnrolement,
} from "../services/biometrie.service";

export async function startBiometrieEnrolementController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    const input = StartBiometrieEnrolementSchema.parse(req.body);
    const result = await startBiometrieEnrolement(input, req.user);

    res.status(200).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBiometrieEnrolementStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    const input = BiometrieStatusSchema.parse({
      code: req.params.code,
    });

    const result = await getBiometrieEnrolementStatus(input, req.user);

    res.status(200).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
