import { Router } from "express";
import {
  createAffectationServiceExterneController,
  createServiceExterneController,
  getServiceExterneByIdController,
  listServicesExternesController,
  resetServiceAccessCodeController,
  updateServiceExterneController,
} from "../controllers/service-externe.controller";

const serviceExterneRouter = Router();

serviceExterneRouter.post("/", createServiceExterneController);
serviceExterneRouter.get("/", listServicesExternesController);
serviceExterneRouter.post(
  "/affectations",
  createAffectationServiceExterneController,
);
serviceExterneRouter.get("/:id", getServiceExterneByIdController);
serviceExterneRouter.put("/:id", updateServiceExterneController);
serviceExterneRouter.post("/:id/reset-access-code", resetServiceAccessCodeController);


export default serviceExterneRouter;
