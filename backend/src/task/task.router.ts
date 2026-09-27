import { Router } from "express";
import { requireTaskAuth } from "./task.middleware";
import { getTaskCount,getAllOverDueTaskCount,getTaskCountByStatus} from "./task.controller"

export const taskRouter = Router();

taskRouter.get("/taskcount", requireTaskAuth("ADMIN"),getTaskCount);
taskRouter.get("/overduecount", requireTaskAuth("ADMIN"),getAllOverDueTaskCount);
taskRouter.get("/countbystatus", requireTaskAuth("ADMIN"),getTaskCountByStatus);