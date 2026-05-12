import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  createBeneficiaireDocument,
  deleteBeneficiaireDocument,
  getBeneficiaireDocumentDownloadUrl,
  listBeneficiaireDocuments,
  uploadBeneficiaireDocumentFile,
} from "../services/document.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, `Identifiant de ${label} invalide`);
  }

  return value;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Payload invalide");
  }

  const raw = body as {
    typeDocument?: unknown;
    titre?: unknown;
    description?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    sizeBytes?: unknown;
    source?: unknown;
  };

  return {
    typeDocument: typeof raw.typeDocument === "string" ? raw.typeDocument : "",
    titre: typeof raw.titre === "string" ? raw.titre : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
    fileName: typeof raw.fileName === "string" ? raw.fileName : undefined,
    mimeType: typeof raw.mimeType === "string" ? raw.mimeType : undefined,
    sizeBytes:
      typeof raw.sizeBytes === "number" && Number.isFinite(raw.sizeBytes)
        ? raw.sizeBytes
        : undefined,
    source: typeof raw.source === "string" ? raw.source : undefined,
  };
}

export async function listBeneficiaireDocumentsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const beneficiaireId = parseUuid(req.params.id, "beneficiaire");
    const documents = await listBeneficiaireDocuments(beneficiaireId);

    res.status(200).json({
      message: "Documents recuperees avec succes",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
}

export async function createBeneficiaireDocumentController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const beneficiaireId = parseUuid(req.params.id, "beneficiaire");
    const payload = parseBody(req.body);
    const result = await createBeneficiaireDocument(beneficiaireId, payload);

    res.status(201).json({
      message: "Document prepare avec succes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadBeneficiaireDocumentFileController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const beneficiaireId = parseUuid(req.params.id, "beneficiaire");
    const documentId = parseUuid(req.params.documentId, "document");
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const mimeType = req.header("content-type");
    const document = await uploadBeneficiaireDocumentFile(
      beneficiaireId,
      documentId,
      body,
      mimeType,
    );

    res.status(200).json({
      message: "Document televerse avec succes",
      data: document,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadDocumentController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const documentId = parseUuid(req.params.documentId, "document");
    const url = await getBeneficiaireDocumentDownloadUrl(documentId);
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
}

export async function deleteDocumentController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const documentId = parseUuid(req.params.documentId, "document");
    const document = await deleteBeneficiaireDocument(documentId);

    res.status(200).json({
      message: "Document supprime avec succes",
      data: document,
    });
  } catch (error) {
    next(error);
  }
}
