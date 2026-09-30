import { Router } from "express";
import { getProjectCount,getAllProject,getMyProjects,getProjectManagers,addProject,editProject,deleteProject } from "./project.controller";
import { requireProjectAuth } from "./project.middleware";

export const projectRouter = Router();

projectRouter.get("/projectcount", requireProjectAuth("ADMIN", "PROJECT_MANAGER"),getProjectCount);
projectRouter.get("/", requireProjectAuth("ADMIN"),getAllProject);
projectRouter.get("/my-projects", requireProjectAuth("ADMIN","PROJECT_MANAGER"), getMyProjects)
projectRouter.get("/managers", requireProjectAuth("ADMIN","PROJECT_MANAGER"),getProjectManagers);
projectRouter.post("/", requireProjectAuth("ADMIN","PROJECT_MANAGER"),addProject);
projectRouter.put("/:id", requireProjectAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),editProject);
projectRouter.delete("/:id", requireProjectAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),deleteProject);
