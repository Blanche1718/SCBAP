import { Router } from "express";
import {
  getBiometrieEnrolementStatusController,
  startBiometrieEnrolementController,
  forceVerifyBiometrieEnrolementController,
} from "../controllers/biometrie.controller";

const biometrieRouter = Router();

biometrieRouter.post("/enrolement", startBiometrieEnrolementController);
biometrieRouter.get("/:code/status", getBiometrieEnrolementStatusController);
biometrieRouter.post("/:beneficiaireId/force-verify", forceVerifyBiometrieEnrolementController);

export default biometrieRouter;
