import cron from "node-cron";
import type { Server } from "socket.io";
import { markOverdueTasks } from "../task/task.service";

export function startOverdueJob(io: Server) {
  return cron.schedule(
    "* * * * *",
    async () => {
      try {
        const tasks = await markOverdueTasks();

        if (tasks.length === 0) return;

        io.to("admins").emit("task:updated");
        io.to("admins").emit("notification:created");

        const recipients = new Set<string>();

        for (const task of tasks) {
          if (task.project_creator_id) {
            recipients.add(task.project_creator_id);
          }

          if (task.assigned_to) {
            recipients.add(task.assigned_to);
          }
        }

        for (const userId of recipients) {
          io.to(`user:${userId}`).emit("task:updated");
          io.to(`user:${userId}`).emit("notification:created");
        }
        console.log("corn sheduler completed running");
      } catch (error) {
        console.error("Overdue task job failed:", error);
      }
    },
    {
      timezone: "UTC",
      noOverlap: true,
    },
  );
}