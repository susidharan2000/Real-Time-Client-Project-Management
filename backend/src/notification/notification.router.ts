import { Router } from "express";
import { requireClientAuth } from "../client/client.middleware";
import { getNotifications, markAsReaded } from "./notification.controller";

export const notificationRouter = Router();


notificationRouter.get("/", requireClientAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),getNotifications);
notificationRouter.patch("/mark-as-readed", requireClientAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),markAsReaded);
