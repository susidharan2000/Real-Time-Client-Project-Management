type HeaderProps = {
  userName: string;
  title?: string;
  notificationCount?: number;
  role?: string;
  handleLogout: ()=> Promise<void>
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  PROJECT_MANAGER: "Project manager",
  DEVELOPER: "Developer",
};

function Header({userName, title = "Project workspace", notificationCount = 0, role ,handleLogout}: HeaderProps) {

  
  const displayName = userName.trim() || "Workspace member";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const unreadCount = Number.isFinite(notificationCount)
    ? Math.max(0, Math.floor(notificationCount))
    : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:px-6 lg:grid-cols-3">
        <div className="col-span-2 row-start-2 flex min-w-0 items-center gap-3 border-t border-slate-100 pt-3 sm:col-span-1 sm:row-start-1 sm:border-0 sm:pt-0">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={displayName}>
              {displayName}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {(role && roleLabels[role]) || "Team member"}
            </p>
          </div>
        </div>

        <p
          className="col-start-1 row-start-1 min-w-0 truncate text-lg font-bold tracking-tight sm:col-start-2 sm:text-center sm:text-xl"
          title={title}
        >
          {title}
        </p>

        <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end sm:col-start-3 sm:gap-3">
        <div
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
          role="status"
          aria-atomic="true"
        >
          <span className="relative flex size-7 shrink-0 items-center justify-center text-slate-600" aria-hidden="true">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span
              className={`absolute -right-2 -top-2 min-w-5 rounded-full px-1 text-center text-[10px] font-bold leading-5 ring-2 ring-white ${
                unreadCount > 0 ? "bg-amber-300 text-amber-950" : "bg-slate-100 text-slate-600"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
          <span className="hidden text-sm font-medium lg:inline" aria-hidden="true">
            Notifications
          </span>
          <span className="sr-only">{unreadCount} unread notifications</span>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 sm:px-4"
          onClick={handleLogout}
        >
          <svg
            className="hidden size-4 sm:block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Log out
        </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
