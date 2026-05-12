import { Router } from "express";
import {
  createDossierController,
  exportDossiersController,
  getDossierByIdController,
  getDossiersController,
  softDeleteDossierController,
  updateDossierController,
} from "../controllers/dossier.controller";
import {
  createObligationController,
  getObligationsByDossierController,
} from "../controllers/obligation.controller";
import {
  syncDapgLiberationConditionnelleController,
  syncAllDapgLiberationConditionnellesController,
} from "../controllers/dapg-import.controller";

const dossierRouter = Router();

dossierRouter.get("/", getDossiersController);
dossierRouter.get("/export", exportDossiersController);
dossierRouter.post("/dapg/sync", syncAllDapgLiberationConditionnellesController);
dossierRouter.post("/dapg/:dapgId/sync", syncDapgLiberationConditionnelleController);
dossierRouter.post("/", createDossierController);
dossierRouter.get("/:id", getDossierByIdController);
dossierRouter.get("/:dossierId/obligations", getObligationsByDossierController);
dossierRouter.post("/:dossierId/obligations", createObligationController);
dossierRouter.put("/:id", updateDossierController);
dossierRouter.delete("/:id", softDeleteDossierController);

export default dossierRouter;
