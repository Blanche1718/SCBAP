import { Router } from "express";
import {
  loginController,
  logoutController,
  meController,
} from "../controllers/auth.controller";
import { requireAuth, requireLoginRateLimit } from "../auth/auth.middleware";

const authRouter = Router();

authRouter.post("/login", requireLoginRateLimit, loginController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", requireAuth, meController);

export default authRouter;
