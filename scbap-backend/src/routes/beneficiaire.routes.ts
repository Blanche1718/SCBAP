import { Router } from "express";
import {
  getBeneficiaireByIdController,
  getBeneficiairesController,
} from "../controllers/beneficiaire.controller";

const beneficiaireRouter = Router();

beneficiaireRouter.get("/", getBeneficiairesController);
beneficiaireRouter.get("/:id", getBeneficiaireByIdController);

export default beneficiaireRouter;
