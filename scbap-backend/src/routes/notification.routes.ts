import { Router } from "express";
import {
  getNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from "../controllers/notification.controller";

const notificationRouter = Router();

notificationRouter.get("/", getNotificationsController);
notificationRouter.patch("/lire-tout", markAllNotificationsAsReadController);
notificationRouter.patch("/:id/lire", markNotificationAsReadController);

export default notificationRouter;
