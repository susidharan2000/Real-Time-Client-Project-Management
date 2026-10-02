type DeveloperDashboardProps = {
  username: string;
  userId: string;
};

const overviewCards = [
  { label: "Assigned tasks", description: "Work on your list", color: "bg-blue-50 text-blue-700", icon: "M9 4H5v17h14V4h-4M9 2h6v4H9ZM9 11h6M9 15h6" },
  { label: "In progress", description: "Tasks you are working on", color: "bg-emerald-50 text-emerald-700", icon: "M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8M18.4 5.6l-2.8 2.8m-7.2 7.2-2.8 2.8" },
  { label: "In review", description: "Ready for feedback", color: "bg-amber-50 text-amber-700", icon: "M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  { label: "Overdue tasks", description: "Need your attention", color: "bg-rose-50 text-rose-700", icon: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2" },
];

const taskStatuses = [
  { label: "To do", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  { label: "In progress", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  { label: "In review", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-800" },
  { label: "Done", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
];

function DeveloperDashboard({ username }: DeveloperDashboardProps) {
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Your task overview">
          {overviewCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-medium text-slate-600">{card.label}</h2>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.color}`} aria-hidden="true">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                </span>
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-tight text-slate-400 tabular-nums" aria-label={`${card.label} count unavailable`}>—</p>
              <p className="mt-2 text-xs text-slate-500">{card.description}</p>
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
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-400 tabular-nums" aria-label={`${status.label} count unavailable`}>—</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="developer-work-title">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 id="developer-work-title" className="text-lg font-semibold">Assigned work</h2>
              <p className="mt-1 text-sm text-slate-500">The tasks on your plate.</p>
            </div>
            <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H5v17h14V4h-4M9 2h6v4H9ZM8 12l2 2 5-5" /></svg>
              </span>
              <p className="mt-4 text-sm font-semibold">Your task list</p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Assigned tasks and their next steps will appear here.</p>
            </div>
          </section>

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
        </div>
      </div>
    </section>
  );
}

export default DeveloperDashboard;
