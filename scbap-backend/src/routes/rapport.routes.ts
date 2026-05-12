import { Router } from "express";
import {
  createPrefilledRapportController,
  finalizeRapportController,
  listDocumentsRecusController,
  listEvaluationsRecuesController,
  listRapportsRedigesController,
  reopenRapportDraftController,
  updateDraftRapportController,
} from "../controllers/rapport.controller";

const rapportRouter = Router();

rapportRouter.post("/prefilled", createPrefilledRapportController);
rapportRouter.get("/", listRapportsRedigesController);
rapportRouter.get("/evaluations", listEvaluationsRecuesController);
rapportRouter.get("/documents", listDocumentsRecusController);
rapportRouter.patch("/:id/draft", updateDraftRapportController);
rapportRouter.patch("/:id/finalize", finalizeRapportController);
rapportRouter.patch("/:id/reopen", reopenRapportDraftController);

export default rapportRouter;
