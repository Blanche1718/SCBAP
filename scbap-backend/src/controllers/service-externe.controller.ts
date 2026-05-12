import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  CreateAffectationServiceExterneSchema,
  CreateServiceExterneSchema,
} from "../schemas/service-externe.schema";
import {
  createAffectationServiceExterne,
  createServiceExterne,
  getServiceExterneById,
  listServicesExternes,
  resetServiceAccessCode,
} from "../services/service-externe.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseServiceExterneId(idParam: string | string[] | undefined) {
  if (typeof idParam !== "string" || !UUID_REGEX.test(idParam)) {
    throw new HttpError(400, "Identifiant de service externe invalide");
  }

  return idParam;
}

export async function createServiceExterneController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = CreateServiceExterneSchema.parse(req.body);
    const result = await createServiceExterne(input);

    res.status(201).json({
      message: "Service externe cree avec succes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listServicesExternesController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const services = await listServicesExternes();

    res.status(200).json({
      message: "Liste des services externes recuperee avec succes",
      data: services,
    });
  } catch (error) {
    next(error);
  }
}

export async function getServiceExterneByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const serviceId = parseServiceExterneId(req.params.id);
    const service = await getServiceExterneById(serviceId);

    res.status(200).json({
      message: "Service externe recupere avec succes",
      data: service,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetServiceAccessCodeController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const serviceId = parseServiceExterneId(req.params.id);
    const result = await resetServiceAccessCode(serviceId);

    res.status(200).json({
      message: "Code d'acces du service externe reinitialise avec succes",
      data: { codeAccesInitial: result.codeAccesInitial },
    });
  } catch (error) {
    next(error);
  }
}

export async function createAffectationServiceExterneController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = CreateAffectationServiceExterneSchema.parse(req.body);
    const affectation = await createAffectationServiceExterne(input);

    res.status(201).json({
      message: "Affectation de service externe creee avec succes",
      data: affectation,
    });
  } catch (error) {
    next(error);
  }
}
