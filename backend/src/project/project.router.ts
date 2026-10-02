import { Router } from "express";
import { getProjectCount,getAllProject,getMyProjects,getProjectManagers,addProject,editProject,deleteProject,getMyProjectCount } from "./project.controller";
import { requireProjectAuth } from "./project.middleware";

export const projectRouter = Router();

projectRouter.get("/projectcount", requireProjectAuth("ADMIN"),getProjectCount);
projectRouter.get("/", requireProjectAuth("ADMIN","PROJECT_MANAGER"),getAllProject);
projectRouter.get("/my-projects", requireProjectAuth("ADMIN","PROJECT_MANAGER"), getMyProjects)
projectRouter.get("/managers", requireProjectAuth("ADMIN","PROJECT_MANAGER"),getProjectManagers);
projectRouter.post("/", requireProjectAuth("ADMIN","PROJECT_MANAGER"),addProject);
projectRouter.put("/:id", requireProjectAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),editProject);
projectRouter.delete("/:id", requireProjectAuth("ADMIN","PROJECT_MANAGER","DEVELOPER"),deleteProject);


projectRouter.get("/my-projectcount", requireProjectAuth("ADMIN","PROJECT_MANAGER"),getMyProjectCount);
