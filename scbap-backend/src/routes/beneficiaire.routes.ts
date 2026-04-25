import { Router } from "express";
import {
  confirmBeneficiaireProfilController,
  getBeneficiaireByIdController,
  getBeneficiairesController,
  updateBeneficiaireController,
  syncBeneficiaireObligationsController,
} from "../controllers/beneficiaire.controller";
import {
  createBeneficiaireDocumentController,
  listBeneficiaireDocumentsController,
  uploadBeneficiaireDocumentFileController,
} from "../controllers/document.controller";
import { raw } from "express";

const beneficiaireRouter = Router();

beneficiaireRouter.get("/:id/documents", listBeneficiaireDocumentsController);
beneficiaireRouter.post("/:id/documents", createBeneficiaireDocumentController);
beneficiaireRouter.put(
  "/:id/documents/:documentId/file",
  raw({ type: "*/*", limit: "50mb" }),
  uploadBeneficiaireDocumentFileController,
);
beneficiaireRouter.get("/", getBeneficiairesController);
beneficiaireRouter.get("/:id", getBeneficiaireByIdController);
beneficiaireRouter.patch("/:id", updateBeneficiaireController);
beneficiaireRouter.post("/:id/obligations/specifiques", syncBeneficiaireObligationsController);
beneficiaireRouter.patch("/:id/profil/confirmer", confirmBeneficiaireProfilController);

export default beneficiaireRouter;
