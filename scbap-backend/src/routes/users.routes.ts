import { Router } from "express";
import {
  getCurrentUserController,
  getUsersController,
  getUsersMetaController,
  resetUserPasswordController,
  updateOwnPasswordController,
  updateOwnProfileController,
  updateUserByAdminController,
} from "../controllers/user.controller";
import { requireRole } from "../auth/auth.middleware";

const usersRouter = Router();

usersRouter.get("/me", getCurrentUserController);
usersRouter.patch("/me", updateOwnProfileController);
usersRouter.patch("/me/password", updateOwnPasswordController);

usersRouter.get("/", requireRole("ADMIN"), getUsersController);
usersRouter.get("/meta", requireRole("ADMIN"), getUsersMetaController);
usersRouter.patch("/:id", requireRole("ADMIN"), updateUserByAdminController);
usersRouter.post(
  "/:id/reset-password",
  requireRole("ADMIN"),
  resetUserPasswordController,
);

export default usersRouter;
