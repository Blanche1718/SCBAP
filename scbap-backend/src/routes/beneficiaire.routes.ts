import { Router } from "express";
import {
  confirmBeneficiaireProfilController,
  getBeneficiaireByIdController,
  getBeneficiairesController,
  syncBeneficiaireObligationsController,
} from "../controllers/beneficiaire.controller";

const beneficiaireRouter = Router();

beneficiaireRouter.get("/", getBeneficiairesController);
beneficiaireRouter.get("/:id", getBeneficiaireByIdController);
beneficiaireRouter.post("/:id/obligations/specifiques", syncBeneficiaireObligationsController);
beneficiaireRouter.patch("/:id/profil/confirmer", confirmBeneficiaireProfilController);

export default beneficiaireRouter;
