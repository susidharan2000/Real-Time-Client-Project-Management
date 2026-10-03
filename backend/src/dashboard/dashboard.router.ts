import { Router } from "express";
import {requireDashboardAuth} from "./dashboard.middleware"
import { getAdminSummary,getProjectmanagerSummary,getDeveloperSummary } from "./dashboard.controller";

export const dashboardRouter= Router();

dashboardRouter.get("/getAdminSummary", requireDashboardAuth("ADMIN"),getAdminSummary);
dashboardRouter.get("/projectManager/summary",requireDashboardAuth("PROJECT_MANAGER"),getProjectmanagerSummary);
dashboardRouter.get("/developer/summary",requireDashboardAuth("DEVELOPER"),getDeveloperSummary);
