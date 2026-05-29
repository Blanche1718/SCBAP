import { Router } from "express";
import {
  syncAllDapgLiberationConditionnellesController,
  syncDapgLiberationConditionnelleController,
} from "../controllers/dapg-import.controller";

const router = Router();

router.post("/sync/:dapgId", syncDapgLiberationConditionnelleController);
router.post("/sync-all", syncAllDapgLiberationConditionnellesController);

export default router;