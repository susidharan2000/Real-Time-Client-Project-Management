import axios from "axios";
import { useEffect, useState, type ReactNode } from "react";
import ClientManager from "../components/ClientManager";

type TaskStatus = "TO_DO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type SummaryResponse = {
  totalClients: number;
  totalProject: number;
  totalTask: number;
  totalOverDueTask: number;
  taskByStats: {
    todo: number;
    inprocess: number;
    in_review: number;
    done: number;
  };
  onlineUsers?: number;
};

type AdminDashboardProps = {
  username: string;
  userId: string;
  accessToken: string;
};

const URL = 'http://localhost:3000';

const statuses: {
  key: TaskStatus;
  label: string;
  description: string;
  color: string;
  badge: string;
}[] = [
  { key: "TO_DO", label: "To do", description: "Ready to be picked up", color: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
  { key: "IN_PROGRESS", label: "In progress", description: "Work moving forward", color: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  { key: "IN_REVIEW", label: "In review", description: "Waiting for feedback", color: "bg-amber-400", badge: "bg-amber-50 text-amber-800" },
  { key: "DONE", label: "Done", description: "Completed by the team", color: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
];

const iconPaths = {
  clients: "M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h2v3",
  projects: "M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  tasks: "M9 4H5v17h14V4h-4M9 2h6v4H9ZM9 11h6M9 15h6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  users: "M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2",
  arrow: "M5 12h14m-5-5 5 5-5 5",
};

function Icon({ name, small = false }: { name: keyof typeof iconPaths; small?: boolean }) {
  return (
    <svg className={small ? "size-4 shrink-0" : "size-5 shrink-0"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  );
}

const focusStyle = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";

function SummaryCard({ href, className, children }: { href?: string; className: string; children: ReactNode }) {
  const styles = `flex min-w-0 flex-col rounded-2xl border p-5 shadow-sm transition-colors sm:p-6 ${className}`;
  return href ? <a href={href} className={`${styles} ${focusStyle}`}>{children}</a> : <div className={styles}>{children}</div>;
}

function AdminDashboard({ username, accessToken }: AdminDashboardProps) {
  const [totalClients, setTotalClients] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);
  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, number>>({
  TO_DO: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [clientsOpen, setClientsOpen] = useState(() => window.location.hash === "#clients");

  useEffect(() => {
    const updatePage = () => setClientsOpen(window.location.hash === "#clients");
    window.addEventListener("hashchange", updatePage);
    return () => window.removeEventListener("hashchange", updatePage);
  }, []);

  useEffect(() => {
    if (clientsOpen) return;
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const { data } = await axios.get<SummaryResponse>(`${URL}/dashboard/getSummary`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
          timeout: 10000,
        });
        if (controller.signal.aborted) return;

        setTotalClients(data.totalClients);
        setTotalProjects(data.totalProject);
        setTotalTasks(data.totalTask);
        setOverdueTasks(data.totalOverDueTask);
        setOnlineUsers(data.onlineUsers ?? null);
        setTasksByStatus({
          TO_DO: data.taskByStats.todo,
          IN_PROGRESS: data.taskByStats.inprocess,
          IN_REVIEW: data.taskByStats.in_review,
          DONE: data.taskByStats.done,
        });
        setError("");
      } catch (err) {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setError("Your session has expired. Please sign in again.");
        } else if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError("You do not have permission to view this dashboard.");
        } else {
          setError("Could not load the dashboard. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSummary();
    return () => controller.abort();
  }, [accessToken, retryCount, clientsOpen]);

  function retrySummary() {
    setLoading(true);
    setError("");
    setRetryCount((count) => count + 1);
  }

  const completedPercent = totalTasks > 0 ? Math.round((tasksByStatus.DONE / totalTasks) * 100) : 0;
  const formatCount = (count: number) => loading ? "…" : error ? "—" : count.toLocaleString();

  if (clientsOpen) {
    return <ClientManager accessToken={accessToken}/>;
  }

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10" aria-labelledby="admin-dashboard-title" aria-busy={loading}>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Workspace overview</p>
            <h1 id="admin-dashboard-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Admin dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Welcome back, <span className="font-medium text-slate-800">{username.trim() || "Admin"}</span>. Here’s how your projects and team are doing.
            </p>
          </div>
          {loading && <p role="status" className="text-sm text-slate-500">Loading overview…</p>}
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{error}</p>
            <button type="button" onClick={retrySummary} className={`rounded-lg px-3 py-2 font-semibold hover:bg-red-100 ${focusStyle}`}>Try again</button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Workspace totals">
          <SummaryCard className="border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-slate-600">Total clients</h2>
              <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Icon name="clients" /></span>
            </div>
            <p className="mt-5 break-words text-4xl font-semibold tracking-tight tabular-nums">{formatCount(totalClients)}</p>
            <p className="mt-2 text-xs text-slate-500">Clients in your workspace</p>
            <a href="#clients" className={`mt-6 flex w-full items-center justify-between rounded-sm border-t border-slate-100 pt-4 text-xs font-semibold text-violet-700 hover:text-violet-900 ${focusStyle}`}>View clients <Icon name="arrow" small /></a>
          </SummaryCard>

          <SummaryCard href="/projects" className="border-emerald-900 bg-emerald-950 text-white hover:bg-emerald-900">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-emerald-50">Total projects</h2>
              <span className="rounded-xl bg-white/10 p-2.5 text-emerald-200"><Icon name="projects" /></span>
            </div>
            <p className="mt-5 break-words text-4xl font-semibold tracking-tight tabular-nums">{formatCount(totalProjects)}</p>
            <p className="mt-2 text-xs text-emerald-100">Across your workspace</p>
            <span className="mt-6 flex items-center justify-between border-t border-white/15 pt-4 text-xs font-semibold text-emerald-50">View projects <Icon name="arrow" small /></span>
          </SummaryCard>

          <SummaryCard href="/tasks" className="border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-slate-600">Total tasks</h2>
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Icon name="tasks" /></span>
            </div>
            <p className="mt-5 break-words text-4xl font-semibold tracking-tight tabular-nums">{formatCount(totalTasks)}</p>
            <p className="mt-2 text-xs text-slate-500">All projects, every status</p>
            <span className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-700">View all tasks <Icon name="arrow" small /></span>
          </SummaryCard>

          <SummaryCard href="/tasks?overdue=true" className="border-rose-200 bg-rose-50/60 hover:border-rose-300 hover:bg-rose-50">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-rose-800">Overdue tasks</h2>
              <span className="rounded-xl bg-rose-100 p-2.5 text-rose-600"><Icon name="clock" /></span>
            </div>
            <p className="mt-5 break-words text-4xl font-semibold tracking-tight text-rose-900 tabular-nums">{formatCount(overdueTasks)}</p>
            <p className="mt-2 text-xs text-rose-700">Past due and not completed</p>
            <span className="mt-6 flex items-center justify-between border-t border-rose-200/70 pt-4 text-xs font-semibold text-rose-800">Review overdue tasks <Icon name="arrow" small /></span>
          </SummaryCard>

          <SummaryCard className="border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-slate-600">Users online now</h2>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon name="users" /></span>
            </div>
            <p className="mt-5 break-words text-4xl font-semibold tracking-tight tabular-nums">{loading ? "…" : onlineUsers === null ? "—" : formatCount(onlineUsers)}</p>
            <p className="mt-2 text-xs text-slate-500">{loading ? "Loading availability" : error || onlineUsers === null ? "Online count unavailable" : "Currently active in the workspace"}</p>
            <span className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
              <span className={`size-2 rounded-full ${loading || error || !onlineUsers ? "bg-slate-300" : "bg-emerald-500"}`} aria-hidden="true" />
              Team availability
            </span>
          </SummaryCard>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="task-status-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="task-status-title" className="text-lg font-semibold tracking-tight">Tasks by status</h2>
              <p className="mt-1 text-sm text-slate-500">From the first step to the finish line.</p>
            </div>
            <a href="/tasks" className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 ${focusStyle}`}>View all tasks <Icon name="arrow" small /></a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statuses.map((status) => (
              <a key={status.key} href={`/tasks?status=${status.key}`} className={`rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-400 hover:bg-slate-50 ${focusStyle}`}>
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}>
                  <span className={`size-1.5 rounded-full ${status.color}`} aria-hidden="true" />
                  {status.label}
                </span>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="break-words text-3xl font-semibold tracking-tight tabular-nums">{formatCount(tasksByStatus[status.key])}</p>
                  <span className="text-slate-400"><Icon name="arrow" small /></span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{status.description}</p>
              </a>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-medium text-slate-600">{formatCount(totalTasks)} tasks across all statuses</p>
              <p className="font-semibold text-emerald-700">{loading || error ? "—" : `${completedPercent}%`} completed</p>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              {statuses.map((status) => (
                <span key={status.key} className={status.color} style={{ width: `${!loading && !error && totalTasks > 0 ? (tasksByStatus[status.key] / totalTasks) * 100 : 0}%` }} />
              ))}
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}

export default AdminDashboard;
