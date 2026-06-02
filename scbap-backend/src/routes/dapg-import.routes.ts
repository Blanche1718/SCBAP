import { Router } from "express";
import {
  checkDapgConnectionController,
  syncAllDapgLiberationConditionnellesController,
  syncDapgLiberationConditionnelleController,
} from "../controllers/dapg-import.controller";

const router = Router();

router.get("/diagnostics", checkDapgConnectionController);
router.post("/sync/:dapgId", syncDapgLiberationConditionnelleController);
router.post("/sync-all", syncAllDapgLiberationConditionnellesController);

export default router;
