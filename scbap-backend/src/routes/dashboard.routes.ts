import { Router } from "express";
import {
  getDashboardStatsController,
  getDashboardEventsController,
  getDashboardComplianceController,
  getDashboardComplianceTrendController,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/stats", getDashboardStatsController);
router.get("/events", getDashboardEventsController);
router.get("/compliance", getDashboardComplianceController);
router.get("/compliance/trend", getDashboardComplianceTrendController);

export default router;
