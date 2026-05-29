import type { NextFunction, Request, Response } from "express";
import { getJuridictions } from "../services/juridiction.service";

export async function getJuridictionsController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const juridictions = await getJuridictions();

    res.status(200).json({
      message: "Juridictions recuperees avec succes",
      data: juridictions,
    });
  } catch (error) {
    next(error);
  }
}
