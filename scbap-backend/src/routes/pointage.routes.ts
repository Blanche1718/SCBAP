import { Router } from "express";
import {
  getPointageByIdController,
  getPointagesController,
  checkAbsencesController,
} from "../controllers/pointage.controller";

const pointageRouter = Router();

pointageRouter.get("/", getPointagesController);
pointageRouter.get("/:id", getPointageByIdController);
pointageRouter.post("/system/check-absences", checkAbsencesController);

export default pointageRouter;
