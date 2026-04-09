import { Router } from "express";
import {
  createDossierController,
  getDossierByIdController,
  getDossiersController,
} from "../controllers/dossier.controller";

const dossierRouter = Router();

dossierRouter.get("/", getDossiersController);
dossierRouter.get("/:id", getDossierByIdController);
dossierRouter.post("/", createDossierController);

export default dossierRouter;
