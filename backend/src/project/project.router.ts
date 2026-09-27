import { Router } from "express";
import { getProjectCount } from "./project.controller";
import { requireProjectAuth } from "./project.middleware";

export const projectRouter = Router();

projectRouter.get("/projectcount", requireProjectAuth("ADMIN", "PROJECT_MANAGER"),getProjectCount);
