import { Router } from "express";
import {
  getDossierByIdController,
  getDossiersController,
  softDeleteDossierController,
  updateDossierController,
} from "../controllers/dossier.controller";
import {
  createObligationController,
  getObligationsByDossierController,
} from "../controllers/obligation.controller";

const dossierRouter = Router();

dossierRouter.get("/", getDossiersController);
dossierRouter.get("/:id", getDossierByIdController);
dossierRouter.get("/:dossierId/obligations", getObligationsByDossierController);
dossierRouter.post("/:dossierId/obligations", createObligationController);
dossierRouter.put("/:id", updateDossierController);
dossierRouter.delete("/:id", softDeleteDossierController);

export default dossierRouter;
