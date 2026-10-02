import type { Request, Response } from "express";
import { fetchClientCount } from "../client/client.service.ts";
import { fetchProjectCount,fetchManagedProjectCount } from "../project/project.service.ts";
import {fetchCreatedTaskCount,fetchCreatedOverdueTaskCount, fetchCreatedTaskCountByStatus,fetchUpcomingTaskByDueDateForManager, UpcomingTask, TaskCounts} from "../task/task.service.ts"
import {
  fetchTaskCount,
  fetchOverDueTaskCount,
  fetchTaskCountbyStatus,
} from "../task/task.service.ts";

export async function getAdminSummary(_req: Request, res: Response){
  try {
    const [totalClients, totalProject, totalTask, totalOverDueTask, taskByStats] =
      await Promise.all([
        fetchClientCount(),
        fetchProjectCount(),
        fetchTaskCount(),
        fetchOverDueTaskCount(),
        fetchTaskCountbyStatus(),
      ]);


    return res.status(200).json({
      totalClients,
      totalProject,
      totalTask,
      totalOverDueTask,
      taskByStats,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    return res.status(500).json({ message: "Could not fetch dashboard summary" });
  }
};



export async function getProjectmanagerSummary(_req: Request, res: Response){
  try{
    const userID:string = res.locals.userId;
    const [totalManagedProjects, totalCreatedTasks,totalOverDueTasks, taskByStatus,upcomingDueTasks]:[number, number, number, TaskCounts, UpcomingTask[]] = await Promise.all(
      [
        fetchManagedProjectCount(userID),
        fetchCreatedTaskCount(userID),
        fetchCreatedOverdueTaskCount(userID),
        fetchCreatedTaskCountByStatus(userID),
        fetchUpcomingTaskByDueDateForManager(userID),
      ]
    )
    return res.status(200).json({
      totalManagedProjects,
      totalCreatedTasks,
      totalOverDueTasks,
      taskByStatus,
      upcomingDueTasks,
    });
  }
  catch (error) {
    console.error("Failed to fetch project manager summary:", error);
    return res.status(500).json({ message: "Could not fetch project manager summary" });
  }
}
