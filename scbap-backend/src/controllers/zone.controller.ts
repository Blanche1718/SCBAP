import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createBeneficiaireZone,
  deleteZone,
  listBeneficiaireZones,
  updateZone,
} from "../services/zone.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, `Identifiant de ${label} invalide`);
  }

  return value;
}

export async function getBeneficiaireZonesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const beneficiaireId = parseUuid(req.params.id, "beneficiaire");
    const zones = await listBeneficiaireZones(beneficiaireId, req.user);

    res.status(200).json({
      message: "Zones du beneficiaire recuperees avec succes",
      data: zones,
    });
  } catch (error) {
    next(error);
  }
}

export async function createBeneficiaireZoneController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const beneficiaireId = parseUuid(req.params.id, "beneficiaire");
    const zone = await createBeneficiaireZone(beneficiaireId, req.body, req.user);

    res.status(201).json({
      message: "Zone creee avec succes",
      data: zone,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateZoneController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const zoneId = parseUuid(req.params.zoneId, "zone");
    const zone = await updateZone(zoneId, req.body, req.user);

    res.status(200).json({
      message: "Zone mise a jour avec succes",
      data: zone,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteZoneController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const zoneId = parseUuid(req.params.zoneId, "zone");
    await deleteZone(zoneId, req.user);

    res.status(200).json({
      message: "Zone supprimee avec succes",
      data: { id: zoneId },
    });
  } catch (error) {
    next(error);
  }
}
