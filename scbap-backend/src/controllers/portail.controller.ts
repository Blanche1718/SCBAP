import type { NextFunction, Request, Response } from "express";
import {
  authenticatePortalAccess,
  requestPortalAccessCode,
} from "../auth/portal-auth.service";
import {
  CreatePortalEvaluationSchema,
  PortalLoginSchema,
  RequestPortalAccessCodeSchema,
} from "../schemas/portail.schema";
import { HttpError } from "../errorHandler";
import {
  createPortalEvaluation,
  createPortalEvaluationDocument,
  deletePortalEvaluation,
  getPortalEvaluationDocumentDownloadUrl,
  listPortalEvaluations,
  uploadPortalEvaluationDocumentFile,
} from "../services/portail.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, `Identifiant de ${label} invalide`);
  }

  return value;
}

function parseDocumentBody(body: unknown) {
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
  };
}

export async function requestPortalAccessCodeController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = RequestPortalAccessCodeSchema.parse(req.body);
    const result = await requestPortalAccessCode(input.codeSuivi, input.email);

    res.status(200).json({
      message: "Code de service envoye avec succes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function portailLoginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = PortalLoginSchema.parse(req.body);
    const result = await authenticatePortalAccess(
      input.codeSuivi,
      input.codeService,
    );

    res.status(200).json({
      message: "Authentification portail reussie",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function portailMeController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    res.status(200).json({
      message: "Session portail recuperee avec succes",
      data: req.portalSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPortalEvaluationsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    const evaluations = await listPortalEvaluations(req.portalSession);

    res.status(200).json({
      message: "Historique des evaluations recupere avec succes",
      data: evaluations,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPortalEvaluationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    const input = CreatePortalEvaluationSchema.parse(req.body);
    const evaluation = await createPortalEvaluation(req.portalSession, input);

    res.status(201).json({
      message: "Evaluation enregistree avec succes",
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPortalEvaluationDocumentController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    const evaluationId = parseUuid(req.params.evaluationId, "evaluation");
    const payload = parseDocumentBody(req.body);
    const result = await createPortalEvaluationDocument(
      req.portalSession,
      evaluationId,
      payload,
    );

    res.status(201).json({
      message: "Document d'evaluation prepare avec succes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePortalEvaluationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    const evaluationId = parseUuid(req.params.evaluationId, "evaluation");
    const result = await deletePortalEvaluation(req.portalSession, evaluationId);

    res.status(200).json({
      message: "Evaluation supprimee avec succes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadPortalEvaluationDocumentFileController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    const evaluationId = parseUuid(req.params.evaluationId, "evaluation");
    const documentId = parseUuid(req.params.documentId, "document");
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const mimeType = req.header("content-type");

    const document = await uploadPortalEvaluationDocumentFile(
      req.portalSession,
      evaluationId,
      documentId,
      body,
      mimeType,
    );

    res.status(200).json({
      message: "Document d'evaluation televerse avec succes",
      data: document,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadPortalEvaluationDocumentController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.portalSession) {
      throw new HttpError(401, "Session portail invalide");
    }

    const evaluationId = parseUuid(req.params.evaluationId, "evaluation");
    const documentId = parseUuid(req.params.documentId, "document");
    const url = await getPortalEvaluationDocumentDownloadUrl(
      req.portalSession,
      evaluationId,
      documentId,
    );

    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
}
