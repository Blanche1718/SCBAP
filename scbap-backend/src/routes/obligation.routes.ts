import { Router } from "express";
import {
  getObligationByIdController,
  updateObligationController,
  validateObligationController,
} from "../controllers/obligation.controller";

const obligationRouter = Router();

obligationRouter.get("/:id", getObligationByIdController);
obligationRouter.put("/:id", updateObligationController);
obligationRouter.patch("/:id/validate", validateObligationController);

export default obligationRouter;
