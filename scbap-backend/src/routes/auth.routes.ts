import { Router } from "express";
import { loginController, meController } from "../controllers/auth.controller";
import { requireAuth } from "../auth/auth.middleware";

const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.get("/me", requireAuth, meController);

export default authRouter;
