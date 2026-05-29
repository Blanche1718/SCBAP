import { Router } from "express";
import {
  deleteSpecificObligationReferenceController,
  getObligationByIdController,
  listSpecificObligationReferencesController,
  syncSpecificObligationReferencesController,
  updateObligationController,
  updateSpecificObligationReferenceController,
  validateObligationController,
} from "../controllers/obligation.controller";
import { requireRole } from "../auth/auth.middleware";

const obligationRouter = Router();

obligationRouter.get("/references/specifiques", requireRole("ADMIN"), listSpecificObligationReferencesController);
obligationRouter.post("/references/specifiques/sync", requireRole("ADMIN"), syncSpecificObligationReferencesController);
obligationRouter.put("/references/specifiques/:id", requireRole("ADMIN"), updateSpecificObligationReferenceController);
obligationRouter.delete("/references/specifiques/:id", requireRole("ADMIN"), deleteSpecificObligationReferenceController);
obligationRouter.get("/:id", getObligationByIdController);
obligationRouter.put("/:id", updateObligationController);
obligationRouter.patch("/:id/validate", validateObligationController);

export default obligationRouter;
