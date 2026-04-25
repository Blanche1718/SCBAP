import { Router } from "express";
import { createBiometriePointageController } from "../controllers/pointage-webhook.controller";

const webhooksRouter = Router();

webhooksRouter.post("/pointages/biometrie", createBiometriePointageController);

export default webhooksRouter;
