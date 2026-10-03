import { Router } from "express";
import { requireTaskAuth } from "./task.middleware";
import { getTaskCount,getAllOverDueTaskCount,getTaskCountByStatus,getAllTask,getTaskAssignees,addTask,editTask,deleteTask,getProjectWithAtleastOneTask,getProjectsWithTasksCreatedByMe,getProjectsWithTasksAssignedToMe,searchAllTasks,getMyTasksCount,getCreatedOverdueTaskCount,getCreatedTaskCountByStatus,getUpcomingTaskByDueDateCreatedByMe, searchTasksCreatedByMe,getAssignedTaskCount,getAssignedOverdueTaskCount,getAssignedTaskCountByStatusCount,getUpcomingAssignedTasks,searchTasksAssignedToMe} from "./task.controller"

export const taskRouter = Router();

taskRouter.get("/taskcount", requireTaskAuth("ADMIN"),getTaskCount);
taskRouter.get("/overduecount", requireTaskAuth("ADMIN"),getAllOverDueTaskCount);
taskRouter.get("/countbystatus", requireTaskAuth("ADMIN"),getTaskCountByStatus);

taskRouter.get("/my-taskcount", requireTaskAuth("ADMIN", "PROJECT_MANAGER", "DEVELOPER"),getMyTasksCount);
taskRouter.get("/my-Created-me/overdue-count", requireTaskAuth("ADMIN", "PROJECT_MANAGER"),getCreatedOverdueTaskCount);
taskRouter.get("/my-Created-me/countbystatus", requireTaskAuth("ADMIN", "PROJECT_MANAGER"),getCreatedTaskCountByStatus);
taskRouter.get("/my-Created-me/upcoming-due-tasks", requireTaskAuth("ADMIN", "PROJECT_MANAGER"),getUpcomingTaskByDueDateCreatedByMe);



//ADMIN aand PROJECT MANAGER (CRUD operation)
taskRouter.get("/", requireTaskAuth("ADMIN"),getAllTask);
taskRouter.get("/assignees", requireTaskAuth("ADMIN","PROJECT_MANAGER"),getTaskAssignees);
taskRouter.post("/", requireTaskAuth("ADMIN","PROJECT_MANAGER"),addTask);
taskRouter.put("/:id", requireTaskAuth("ADMIN","PROJECT_MANAGER"),editTask);
taskRouter.delete("/:id", requireTaskAuth("ADMIN","PROJECT_MANAGER"),deleteTask);

// get PROJECT BY TASK
taskRouter.get("/projects",requireTaskAuth("ADMIN"),getProjectWithAtleastOneTask);//get project atleast the project has atleast one Project
taskRouter.get("/created-by-me/projects",requireTaskAuth("ADMIN", "PROJECT_MANAGER"),getProjectsWithTasksCreatedByMe);
taskRouter.get("/assigned-to-me/projects",requireTaskAuth("DEVELOPER"),getProjectsWithTasksAssignedToMe);

//Search API
taskRouter.get("/search",requireTaskAuth("ADMIN"),searchAllTasks);
taskRouter.get("/created-by-me/search",requireTaskAuth("ADMIN", "PROJECT_MANAGER"),searchTasksCreatedByMe);
taskRouter.get("/assigned-to-me/search",requireTaskAuth("DEVELOPER"),searchTasksAssignedToMe);


//Developer Task API
taskRouter.get("/assigned-to-me/count",requireTaskAuth("DEVELOPER"),getAssignedTaskCount);
taskRouter.get("/assigned-to-me/overdue-count",requireTaskAuth("DEVELOPER"),getAssignedOverdueTaskCount);
taskRouter.get("/assigned-to-me/countbystatus",requireTaskAuth("DEVELOPER"),getAssignedTaskCountByStatusCount);
taskRouter.get("/assigned-to-me/upcoming",requireTaskAuth("DEVELOPER"),getUpcomingAssignedTasks);
