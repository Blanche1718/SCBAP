import { Router } from "express";
import {
  getDashboardStatsController,
  getDashboardEventsController,
  getDashboardComplianceController,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/stats", getDashboardStatsController);
router.get("/events", getDashboardEventsController);
router.get("/compliance", getDashboardComplianceController);

export default router;
