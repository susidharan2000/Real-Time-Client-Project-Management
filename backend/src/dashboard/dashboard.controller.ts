import type { Request, Response } from "express";
import { fetchClientCount } from "../client/client.service.ts";
import { fetchProjectCount } from "../project/project.service.ts";
import {
  fetchTaskCount,
  fetchOverDueTaskCount,
  fetchTaskCountbyStatus,
} from "../task/task.service.ts";

export const getSummary = async (_req: Request, res: Response) => {
  try {
    const [totalClients, totalProject, totalTask, totalOverDueTask, taskByStats] =
      await Promise.all([
        fetchClientCount(),
        fetchProjectCount(),
        fetchTaskCount(),
        fetchOverDueTaskCount(),
        fetchTaskCountbyStatus(),
      ]);

      console.log(totalClients,totalProject,totalTask,totalOverDueTask,taskByStats)

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
