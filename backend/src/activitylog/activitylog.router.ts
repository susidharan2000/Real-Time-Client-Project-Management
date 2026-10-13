import { Router } from "express";
import { requireAuth } from "./activity.middleware";
import {getMyActivityFeed, markFeedSeen } from "./activity.controller";

export const activityRouter = Router();

activityRouter.get("/", requireAuth("ADMIN", "PROJECT_MANAGER", "DEVELOPER"),getMyActivityFeed);

activityRouter.post("/seen", requireAuth("ADMIN", "PROJECT_MANAGER", "DEVELOPER"), markFeedSeen);
