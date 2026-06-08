import { Router } from "express";
import {
  getBiometrieEnrolementStatusController,
  startBiometrieEnrolementController,
  forceVerifyBiometrieEnrolementController,
  syncNfcBadgesController,
  getNfcSyncHistoryController,
} from "../controllers/biometrie.controller";
import { requireRole } from "../auth/auth.middleware";

const biometrieRouter = Router();

biometrieRouter.post("/enrolement", startBiometrieEnrolementController);
biometrieRouter.post("/nfc/sync", requireRole("ADMIN"), syncNfcBadgesController);
biometrieRouter.get("/nfc/history", requireRole("ADMIN"), getNfcSyncHistoryController);
biometrieRouter.get("/:code/status", getBiometrieEnrolementStatusController);
biometrieRouter.post("/:beneficiaireId/force-verify", forceVerifyBiometrieEnrolementController);

export default biometrieRouter;
