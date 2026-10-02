import { Router } from "express";
import {requireDashboardAuth} from "./dashboard.middleware"
import { getAdminSummary,getProjectmanagerSummary } from "./dashboard.controller";

export const dashboardRouter= Router();

dashboardRouter.get("/getAdminSummary", requireDashboardAuth("ADMIN"),getAdminSummary);
dashboardRouter.get("/projectManager/summary",requireDashboardAuth("PROJECT_MANAGER"),getProjectmanagerSummary);
