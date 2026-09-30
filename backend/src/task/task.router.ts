import { Router } from "express";
import { requireTaskAuth } from "./task.middleware";
import { getTaskCount,getAllOverDueTaskCount,getTaskCountByStatus,getAllTask,getTaskAssignees,addTask,editTask,deleteTask,getProjectWithAtleastOneTask,getProjectsWithTasksCreatedByMe,getProjectsWithTasksAssignedToMe,searchAllTasks} from "./task.controller"

export const taskRouter = Router();

taskRouter.get("/taskcount", requireTaskAuth("ADMIN"),getTaskCount);
taskRouter.get("/overduecount", requireTaskAuth("ADMIN"),getAllOverDueTaskCount);
taskRouter.get("/countbystatus", requireTaskAuth("ADMIN"),getTaskCountByStatus);


//ADMIN aand PROJECT MANAGER
taskRouter.get("/", requireTaskAuth("ADMIN"),getAllTask);
taskRouter.get("/assignees", requireTaskAuth("ADMIN"),getTaskAssignees);
taskRouter.post("/", requireTaskAuth("ADMIN"),addTask);
taskRouter.put("/:id", requireTaskAuth("ADMIN"),editTask);
taskRouter.delete("/:id", requireTaskAuth("ADMIN"),deleteTask);

// get PROJECT BY TASK
taskRouter.get("/projects",requireTaskAuth("ADMIN"),getProjectWithAtleastOneTask);//get project atleast the project has atleast one Project
taskRouter.get("/created-by-me/projects",requireTaskAuth("ADMIN", "PROJECT_MANAGER"),getProjectsWithTasksCreatedByMe);
taskRouter.get("/assigned-to-me/projects",requireTaskAuth("DEVELOPER"),getProjectsWithTasksAssignedToMe);

//Search API
taskRouter.get("/search",requireTaskAuth("ADMIN"),searchAllTasks);
// taskRouter.get("/created-by-me/search",requireTaskAuth("PROJECT_MANAGER"),searchTasksCreatedByMe);
// taskRouter.get("/assigned-to-me/search",requireTaskAuth("DEVELOPER"),searchTasksAssignedToMe);
