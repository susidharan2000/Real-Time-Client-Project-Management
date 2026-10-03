import axios from "axios";
import { useEffect,useState } from "react";
import { Link } from "react-router";

type DeveloperDashboardProps = {
  username: string;
  userId: string;
  role: string;
  accessToken: string;
};


type TashByStatus = {
  todo :number;
  inprocess:number;
  in_review:number;
  done:number
}

type UpcomingDueTask = {
  task_id: string;
  title: string;
  description: string | null;
  project_id: string;
  project_title: string;
  assigned_to_userid: string | null;
  assigned_to_user_name: string | null;
  created_by_userid: string;
  created_by_user_name: string;
  status: "TO_DO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  due_date: string | null;
  is_overdue: boolean;
};

function DeveloperDashboard({ username, accessToken }: DeveloperDashboardProps) {
  const URL = "http://localhost:3000";
  //Developer Dashboard Summary
  const [totalTasksAssignedToMe,setTotalTasksAssignedToMe] = useState<number>(0)
  const [totalOverdueTasksAssignedToMe,setTotalOverdueTasksAssignedToMe] = useState<number>(0)
  const [taskStatusCounts, setTaskStatusCounts] = useState<TashByStatus>({
      todo: 0,
      inprocess: 0,
      in_review: 0,
      done: 0
    });
  const [upcomingDueTasks, setUpcomingDueTasks] = useState<UpcomingDueTask[]>([]);

  //loading State

  const[loading,setLoading] = useState<boolean>(true)



  useEffect(() =>{
    async function fetchDeveloperDashboardData() {
      try {
        const response = await axios.get(`${URL}/dashboard/developer/summary`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        //console.log(response.data)

        setTotalTasksAssignedToMe(response.data.totalTasksAssignedToMe)
        setTotalOverdueTasksAssignedToMe(response.data.totalOverdueTasksAssignedToMe)
        setTaskStatusCounts(response.data.totalTaskCountByStatus)
        setUpcomingDueTasks(response.data.AssignedUpcomingTasks)

      } catch (error) {
        console.error("Failed to fetch developer dashboard data:", error);
      } finally {
        setLoading(false)
      }
    }
    if(accessToken){
      fetchDeveloperDashboardData();
    }
  },[accessToken]);

  const overviewCards = [
  { label: "Assigned tasks",data:totalTasksAssignedToMe, description: "Work on your list", color: "bg-blue-50 text-blue-700", icon: "M9 4H5v17h14V4h-4M9 2h6v4H9ZM9 11h6M9 15h6", href: "/DeveloperTasks", action: "View tasks" },
  { label: "Overdue tasks",data:totalOverdueTasksAssignedToMe, description: "Need your attention", color: "bg-rose-50 text-rose-700", icon: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2", href: "/DeveloperTasks?overdue=true", action: "View overdue tasks" },
]
const taskStatuses = [
  { label: "To do",data:taskStatusCounts.todo, dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  { label: "In progress",data:taskStatusCounts.inprocess, dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  { label: "In review",data:taskStatusCounts.in_review, dot: "bg-amber-400", badge: "bg-amber-50 text-amber-800" },
  { label: "Done",data:taskStatusCounts.todo,dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
];
  return (
    <section className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10" aria-labelledby="developer-dashboard-title">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Your workspace</p>
          <h1 id="developer-dashboard-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Developer dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Welcome back, <span className="font-medium text-slate-800">{username.trim() || "Developer"}</span>. Stay focused on the work assigned to you.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2" aria-label="Your task overview">
          {overviewCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-medium text-slate-600">{card.label}</h2>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.color}`} aria-hidden="true">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                </span>
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-tight text-slate-400 tabular-nums" aria-label={`${card.label} count unavailable`}>{card.data === undefined?"-":card.data}</p>
              <p className="mt-2 text-xs text-slate-500">{card.description}</p>
              <Link to={card.href} className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-emerald-800 hover:text-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
                {card.action}
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14m-5-5 5 5-5 5" />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="developer-task-status-title">
          <h2 id="developer-task-status-title" className="text-lg font-semibold tracking-tight">My tasks by status</h2>
          <p className="mt-1 text-sm text-slate-500">Follow your work from start to finish.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {taskStatuses.map((status) => (
              <div key={status.label} className="rounded-xl border border-slate-200 p-4">
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}>
                  <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden="true" />{status.label}
                </span>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-400 tabular-nums" aria-label={`${status.label} count unavailable`}>{status.data === undefined ? "-":status.data}</p>
              </div>
            ))}
          </div>
        </section>

        <div>
          {
            loading ? (
              <p role="status" className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading tasks…</p>
            ) : upcomingDueTasks.length === 0 ? (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="developer-deadlines-title">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 id="developer-deadlines-title" className="text-lg font-semibold">Upcoming deadlines</h2>
              <p className="mt-1 text-sm text-slate-500">Know what needs to be done next.</p>
            </div>
            <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700" aria-hidden="true">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></svg>
              </span>
              <p className="mt-4 text-sm font-semibold">Deadlines at a glance</p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Your upcoming due dates will appear here.</p>
            </div>
          </section>
            ):
            (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="developer-deadlines-title">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <h2 id="developer-deadlines-title" className="text-lg font-semibold">Upcoming deadlines</h2>
                  <p className="mt-1 text-sm text-slate-500">Know what needs to be done next.</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {upcomingDueTasks.map((task) => (
                    <li key={task.task_id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{task.project_title}</p>
                        <p className="mt-1 text-xs text-slate-500">Assigned by {task.created_by_user_name}</p>
                      </div>
                      <div className="text-left text-sm sm:text-right">
                        <p className="font-medium text-slate-700">{task.due_date ? new Date(task.due_date).toLocaleString() : "No due date"}</p>
                        <p className="mt-1 text-xs text-slate-500">{task.status.replaceAll("_", " ")} · {task.priority} priority</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          }
        </div>
      </div>
    </section>
  );
}

export default DeveloperDashboard;
