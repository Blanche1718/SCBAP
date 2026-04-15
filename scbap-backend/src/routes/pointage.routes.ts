import { Router } from "express";
import {
  getPointageByIdController,
  getPointagesController,
} from "../controllers/pointage.controller";

const pointageRouter = Router();

pointageRouter.get("/", getPointagesController);
pointageRouter.get("/:id", getPointageByIdController);

export default pointageRouter;
