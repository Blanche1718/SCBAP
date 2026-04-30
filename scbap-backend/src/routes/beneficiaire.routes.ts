import { Router } from "express";
import {
  confirmBeneficiaireProfilController,
  getBeneficiaireByIdController,
  getBeneficiairesController,
  updateBeneficiaireController,
  syncBeneficiaireObligationsController,
} from "../controllers/beneficiaire.controller";
import {
  createBeneficiaireZoneController,
  deleteZoneController,
  getBeneficiaireZonesController,
  updateZoneController,
} from "../controllers/zone.controller";
import {
  createBeneficiaireDocumentController,
  listBeneficiaireDocumentsController,
  uploadBeneficiaireDocumentFileController,
} from "../controllers/document.controller";
import { raw } from "express";

const beneficiaireRouter = Router();

beneficiaireRouter.get("/:id/documents", listBeneficiaireDocumentsController);
beneficiaireRouter.post("/:id/documents", createBeneficiaireDocumentController);
beneficiaireRouter.get("/:id/zones", getBeneficiaireZonesController);
beneficiaireRouter.post("/:id/zones", createBeneficiaireZoneController);
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
beneficiaireRouter.patch("/zones/:zoneId", updateZoneController);
beneficiaireRouter.delete("/zones/:zoneId", deleteZoneController);

export default beneficiaireRouter;
