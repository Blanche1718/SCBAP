import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  BiometriePointageWebhookSchema,
} from "../schemas/pointage-webhook.schema";
import { createBiometricPointage } from "../services/pointage.service";

export async function createBiometriePointageController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = BiometriePointageWebhookSchema.parse(req.body);
    const result = await createBiometricPointage(input);

    res.status(201).json({
      message: "Pointage biométrique enregistré avec succès",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return next(error);
    }

    next(error);
  }
}
