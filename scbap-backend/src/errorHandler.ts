import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Donnees invalides",
      errors: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return res.status(409).json({
        message:
          "Operation impossible car cette ressource est encore utilisee ailleurs",
        meta: error.meta,
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Ressource introuvable",
        meta: error.meta,
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Une ressource avec cette valeur unique existe deja",
        meta: error.meta,
      });
    }

    return res.status(400).json({
      message: "Erreur Prisma",
      code: error.code,
      meta: error.meta,
    });
  }

  if (error instanceof Error) {
    return res.status(500).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Erreur interne du serveur",
  });
}
