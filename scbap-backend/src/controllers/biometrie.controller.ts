import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  BiometrieStatusSchema,
  StartBiometrieEnrolementSchema,
} from "../schemas/biometrie.schema";
import {
  getBiometrieEnrolementStatus,
  startBiometrieEnrolement,
  forceVerifyBiometrieEnrolement,
} from "../services/biometrie.service";
import { syncBeneficiaireNfcBadges } from "../services/nfc-sync.service";
import prisma from "../prisma";

export async function getNfcSyncHistoryController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const records = await prisma.nfcSyncRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 400,
    });

    const uniqueRecordsMap = new Map<string, typeof records[number]>();
    for (const record of records) {
      const mandatKey = record.numeroMandat.trim().toUpperCase();
      if (!uniqueRecordsMap.has(mandatKey)) {
        uniqueRecordsMap.set(mandatKey, record);
      }
    }

    const distinctRecords = Array.from(uniqueRecordsMap.values()).slice(0, 200);

    res.status(200).json({
      message: `Récupération de l'historique NFC (${distinctRecords.length})`,
      data: distinctRecords,
    });
  } catch (error) {
    next(error);
  }
}

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

export async function forceVerifyBiometrieEnrolementController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    if (req.user.role?.nom !== "ADMIN") {
      throw new HttpError(403, "Seuls les administrateurs peuvent forcer la vérification");
    }

    const beneficiaireId = Array.isArray(req.params.beneficiaireId)
      ? req.params.beneficiaireId[0]?.trim()
      : req.params.beneficiaireId?.trim();
    if (!beneficiaireId) {
      throw new HttpError(400, "ID beneficiaire manquant");
    }

    const result = await forceVerifyBiometrieEnrolement(beneficiaireId, req.user);

    res.status(200).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function syncNfcBadgesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new HttpError(401, "Utilisateur non authentifie");
    }

    if (req.user.role?.nom !== "ADMIN") {
      throw new HttpError(403, "Seuls les administrateurs peuvent synchroniser les NFC");
    }

    const result = await syncBeneficiaireNfcBadges();

    const message =
      result.updated > 0 || result.unchanged > 0
        ? `${result.updated} NFC associé(s), ${result.unchanged} déjà à jour`
        : `Synchronisation terminée : ${result.matched} mandat(s) trouvé(s) en base, ${result.missingInScbap} mandat(s) introuvable(s)`;

    res.status(200).json({
      message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
