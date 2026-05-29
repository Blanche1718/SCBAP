import { Router } from "express";
import { createBiometriePointageController } from "../controllers/pointage-webhook.controller";
import { verifyWebhookSignature } from "../middleware/webhook-signature";

const webhooksRouter = Router();

webhooksRouter.post(
  "/pointages/biometrie",
  verifyWebhookSignature,
  createBiometriePointageController,
);

export default webhooksRouter;
