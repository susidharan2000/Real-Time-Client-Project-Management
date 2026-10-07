import { Router } from "express";
import { requireClientAuth } from "../client/client.middleware";
import { getNotifications } from "./notification.controller";

export const notificationRouter = Router();


notificationRouter.get("/", requireClientAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),getNotifications);