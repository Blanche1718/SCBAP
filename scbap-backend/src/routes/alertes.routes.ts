import { Router } from "express";
import {
  getAlertesSurveillanceController,
  markAlertAsProcessedController,
} from "../controllers/alertes-surveillance.controller";

const alertesRouter = Router();

alertesRouter.get("/", getAlertesSurveillanceController);
alertesRouter.patch("/:id/traiter", markAlertAsProcessedController);

export default alertesRouter;
