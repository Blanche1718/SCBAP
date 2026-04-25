import { Router } from "express";
import {
  getBiometrieEnrolementStatusController,
  startBiometrieEnrolementController,
} from "../controllers/biometrie.controller";

const biometrieRouter = Router();

biometrieRouter.post("/enrolement", startBiometrieEnrolementController);
biometrieRouter.get("/:code/status", getBiometrieEnrolementStatusController);

export default biometrieRouter;
