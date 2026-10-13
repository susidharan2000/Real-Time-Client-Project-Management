import { API_URL } from "../api";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Socket } from "socket.io-client";
import ActivityFeed from "../components/ActivityFeed";



type ProjectManagerDashboardProps = {
  username: string;
  userId: string;
  accessToken: string;
  role: string;
  socket:Socket | null;
};


type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type TaskByStatus = {
  todo:number;
  inprocess:number;
  in_review:number;
  done:number;
}

export type UpcomingDueTask = {
  task_id: string;
  title: string;
  project_title: string;
  due_date: string;
  status: TaskStatus;
}

function ProjectManagerDashboard({ username, accessToken,socket }: ProjectManagerDashboardProps) {

  const URL = API_URL;
  //states for handling the dashboard data
  const [managedProjectsCount, setManagedProjectsCount] = useState<number>(0);
  const [createdTasksCount, setCreatedTasksCount] = useState<number>(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState<number>(0);
  const [taskStatusCounts, setTaskStatusCounts] = useState<TaskByStatus>({
    todo: 0,
    inprocess: 0,
    in_review: 0,
    done: 0
  });
  const [upcomingDueTasks, setUpcomingDueTasks] = useState<UpcomingDueTask[]>([]);
  const [taskSummaryRefresh, setTaskSummaryRefresh] = useState(0);
  const [taskPriorityCounts, setTaskPriorityCounts] = useState<Record<TaskPriority, number>>({
    LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
  });

  const taskPriorities = [
    { key: "LOW" as const, label: "Low", badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
    { key: "MEDIUM" as const, label: "Medium", badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    { key: "HIGH" as const, label: "High", badge: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
    { key: "CRITICAL" as const, label: "Critical", badge: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  ];

  const overviewCards = [
  { label: "My projects", count: managedProjectsCount, description: "Projects you created", color: "bg-emerald-50 text-emerald-700", icon: "M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" },
  { label: "Project tasks", count: createdTasksCount, description: "Work planned for your team", color: "bg-blue-50 text-blue-700", icon: "M9 4H5v17h14V4h-4M9 2h6v4H9ZM9 11h6M9 15h6" },
  { label: "Overdue tasks", count: overdueTasksCount, description: "Past their due date", color: "bg-rose-50 text-rose-700", icon: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2" },
  ];

  const taskStatuses = [
  { label: "To do",link:'/tasks/?status=TO_DO', count: taskStatusCounts.todo, dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  { label: "In progress",link:'/tasks/?status=IN_PROGRESS', count: taskStatusCounts.inprocess, dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  { label: "In review",link:'/tasks/?status=IN_REVIEW', count: taskStatusCounts.in_review, dot: "bg-amber-400", badge: "bg-amber-50 text-amber-800" },
  { label: "Done",link:'/tasks/?status=DONE', count: taskStatusCounts.done, dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  ];
  const statusLabels: Record<TaskStatus, string> = {
    TO_DO: "To do",
    IN_PROGRESS: "In progress",
    IN_REVIEW: "In review",
    DONE: "Done",
  };

  //loding State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() =>{
    const controller = new AbortController();
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get(`${URL}/dashboard/projectManager/summary`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        if (controller.signal.aborted) return;
        setManagedProjectsCount(res.data.totalManagedProjects);
        setCreatedTasksCount(res.data.totalCreatedTasks);
        setOverdueTasksCount(res.data.totalOverDueTasks);
        setTaskStatusCounts(res.data.taskByStatus);
        setTaskPriorityCounts(res.data.taskByPriority ?? { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
        setUpcomingDueTasks(res.data.upcomingDueTasks);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch project manager dashboard:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    
    }

    if (accessToken) {
      fetchDashboardData();
    }
    return () => controller.abort();
  },[accessToken, taskSummaryRefresh])

  //Live task updates
  useEffect(() => {
    if (!socket || !accessToken) return;
    const refreshTaskSummary = () => {
      setTaskSummaryRefresh(current => current + 1);
    };
    socket.on("task:created", refreshTaskSummary);
    socket.on("task:deleted", refreshTaskSummary);
    socket.on("task:updated", refreshTaskSummary);
    return () => {
      socket.off("task:created", refreshTaskSummary);
      socket.off("task:deleted", refreshTaskSummary);
      socket.off("task:updated", refreshTaskSummary);
    };
  }, [socket, accessToken]);


  //live Feed
    useEffect(() => {
      if (!socket) return;

      const handleProjectCount = async () => {
        try {
          const res = await axios.get<{ myProjectCount: number }>(
            `${URL}/project/my-projectcount`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          setManagedProjectsCount(res.data.myProjectCount);
        } catch (error) {
          console.error("Could not refresh Project count:", error);
        }
      };

      socket.on("project:created", handleProjectCount);
      socket.on("project:deleted", handleProjectCount);

      return () => {
        socket.off("project:created", handleProjectCount);
        socket.off("project:deleted", handleProjectCount);
      };
    }, [socket]);

  return (
    <section className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10" aria-labelledby="project-manager-dashboard-title">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Workspace overview</p>
          <h1 id="project-manager-dashboard-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Project manager dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Welcome back, <span className="font-medium text-slate-800">{username.trim() || "Project manager"}</span>. Keep your projects and team work in view.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Project manager overview">
          {overviewCards.map((card)=>{
            const linkTo:string = card.label === "My projects" ? "/projects" : card.label === "Project tasks" ? "/tasks" : card.label === "Overdue tasks" ? "/tasks?filter=overdue" : "#";
            return (
              <Link to={linkTo} key={card.label}  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-medium text-slate-600">{card.label}</h2>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.color}`} aria-hidden="true">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                </span>
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-tight text-slate-400 tabular-nums" aria-label={`${card.label} count unavailable`}>{card.count !== undefined ? card.count : "—"}</p>
              <p className="mt-2 text-xs text-slate-500">{card.description}</p>
              {card.label === "My projects" && (
                <span className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-emerald-800">
                  View projects
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </span>
              )}
              {card.label === "Project tasks" && (
                <span className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-emerald-800">
                  View tasks
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </span>
              )}
              {card.label === "Overdue tasks" && (
                <span className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-emerald-800">
                 View Overdue tasks
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </span>
              )}
            </Link>
            )
          })}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="pm-task-status-title">
          <h2 id="pm-task-status-title" className="text-lg font-semibold tracking-tight">Tasks by status</h2>
          <p className="mt-1 text-sm text-slate-500">See how work moves from planning to completion.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {taskStatuses.map((status) => (
              <Link key={status.label} to={status.link} className="rounded-xl border border-slate-200 p-4">
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}>
                  <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden="true" />{status.label}
                </span>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-400 tabular-nums" aria-label={`${status.label} count unavailable`}>{status.count !== undefined ? status.count : "—"}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="pm-task-priority-title">
          <h2 id="pm-task-priority-title" className="text-lg font-semibold tracking-tight">Tasks by priority</h2>
          <p className="mt-1 text-sm text-slate-500">Priority breakdown of tasks in your projects.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {taskPriorities.map((priority) => (
              <Link key={priority.key} to={`/tasks?priority=${priority.key}`} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${priority.badge}`}>
                  <span className={`size-1.5 rounded-full ${priority.dot}`} aria-hidden="true" />{priority.label}
                </span>
                <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{isLoading ? "—" : taskPriorityCounts[priority.key].toLocaleString()}</p>
                <span className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                  View tasks
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ActivityFeed accessToken={accessToken} socket={socket} role="PROJECT_MANAGER" />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="pm-deadlines-title">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 id="pm-deadlines-title" className="text-lg font-semibold">Due this week</h2>
              <p className="mt-1 text-sm text-slate-500">Upcoming deadlines through Sunday (UTC).</p>
            </div>
            {isLoading ? (
              <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Loading deadlines…</p>
            ) : upcomingDueTasks.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700" aria-hidden="true">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></svg>
              </span>
              <p className="mt-4 text-sm font-semibold">Deadlines at a glance</p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Upcoming task due dates will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcomingDueTasks.map((task) => (
                  <li key={task.task_id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{task.project_title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{statusLabels[task.status]}</span>
                      <time dateTime={task.due_date} className="text-sm font-medium text-slate-700">
                        {new Date(task.due_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </section>
  );
}

export default ProjectManagerDashboard;
