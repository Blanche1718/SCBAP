import { Router } from "express";
import {
  getAlertesSurveillanceController,
  markAlertAsProcessedController,
} from "../controllers/alertes-surveillance.controller";
import { buildSurveillanceSnapshot } from "../services/surveillance-realtime.service";
import { getUserJuridictionCode } from "../utils/juridiction";

const alertesRouter = Router();

alertesRouter.get("/snapshot", async (req, res, next) => {
  try {
    const requestedJurisdiction =
      typeof req.query.juridictionId === "string" ? req.query.juridictionId : null;
    const scopeJurisdictionId =
      req.user?.role.nom === "ADMIN"
        ? getUserJuridictionCode(requestedJurisdiction) ?? undefined
        : getUserJuridictionCode(req.user?.structure.juridiction) ?? "__NO_ACCESS__";
    const snapshot = await buildSurveillanceSnapshot({ scopeJurisdictionId });

    res.json({
      message: "Snapshot surveillance recupere avec succes",
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
});
alertesRouter.get("/", getAlertesSurveillanceController);
alertesRouter.patch("/:id/traiter", markAlertAsProcessedController);

export default alertesRouter;
