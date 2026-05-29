import { Router, raw } from "express";
import { requirePortalAuth } from "../auth/portal-auth.middleware";
import {
  createPortalEvaluationController,
  createPortalEvaluationDocumentController,
  deletePortalEvaluationController,
  downloadPortalEvaluationDocumentController,
  listPortalEvaluationsController,
  portailLoginController,
  portailMeController,
  requestPortalAccessCodeController,
  uploadPortalEvaluationDocumentFileController,
} from "../controllers/portail.controller";

const portailRouter = Router();

portailRouter.post("/auth/request-code", requestPortalAccessCodeController);
portailRouter.post("/auth", portailLoginController);
portailRouter.get("/me", requirePortalAuth, portailMeController);
portailRouter.post(
  "/evaluations",
  requirePortalAuth,
  createPortalEvaluationController,
);
portailRouter.get(
  "/evaluations",
  requirePortalAuth,
  listPortalEvaluationsController,
);

portailRouter.post(
  "/evaluations/:evaluationId/documents",
  requirePortalAuth,
  createPortalEvaluationDocumentController,
);
portailRouter.delete(
  "/evaluations/:evaluationId",
  requirePortalAuth,
  deletePortalEvaluationController,
);
portailRouter.put(
  "/evaluations/:evaluationId/documents/:documentId/file",
  requirePortalAuth,
  raw({ type: "*/*", limit: "25mb" }),
  uploadPortalEvaluationDocumentFileController,
);
portailRouter.get(
  "/evaluations/:evaluationId/documents/:documentId/download",
  requirePortalAuth,
  downloadPortalEvaluationDocumentController,
);

export default portailRouter;
