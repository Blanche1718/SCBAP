"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const obligation_controller_1 = require("../controllers/obligation.controller");
const obligationRouter = (0, express_1.Router)();
obligationRouter.get("/:id", obligation_controller_1.getObligationByIdController);
obligationRouter.put("/:id", obligation_controller_1.updateObligationController);
obligationRouter.patch("/:id/validate", obligation_controller_1.validateObligationController);
exports.default = obligationRouter;
//# sourceMappingURL=obligation.routes.js.map