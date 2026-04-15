"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dossier_controller_1 = require("../controllers/dossier.controller");
const obligation_controller_1 = require("../controllers/obligation.controller");
const dapg_import_controller_1 = require("../controllers/dapg-import.controller");
const dossierRouter = (0, express_1.Router)();
dossierRouter.get("/", dossier_controller_1.getDossiersController);
dossierRouter.post("/dapg/sync", dapg_import_controller_1.syncAllDapgLiberationConditionnellesController);
dossierRouter.post("/dapg/:dapgId/sync", dapg_import_controller_1.syncDapgLiberationConditionnelleController);
dossierRouter.get("/:id", dossier_controller_1.getDossierByIdController);
dossierRouter.get("/:dossierId/obligations", obligation_controller_1.getObligationsByDossierController);
dossierRouter.post("/:dossierId/obligations", obligation_controller_1.createObligationController);
dossierRouter.put("/:id", dossier_controller_1.updateDossierController);
dossierRouter.delete("/:id", dossier_controller_1.softDeleteDossierController);
exports.default = dossierRouter;
//# sourceMappingURL=dossier.routes.js.map