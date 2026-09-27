import { Router } from "express";
import {requireDashboardAuth} from "./dashboard.middleware"
import { getSummary } from "./dashboard.controller";

export const dashboardRouter= Router();

dashboardRouter.get("/getSummary", requireDashboardAuth("ADMIN"),getSummary);
