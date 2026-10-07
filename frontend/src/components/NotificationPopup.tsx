export type NotificationItem = {
  id: string;
  message: string;
  timeLabel: string;
  unread: boolean;
};

type NotificationPopupProps = {
  unreadCount: number;
  notifications?: NotificationItem[];
};

export default function NotificationPopup({ unreadCount, notifications = [] }: NotificationPopupProps) {
  return (
    <div
      id="notification-popup"
      className="absolute right-4 top-[calc(100%+0.5rem)] z-30 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl shadow-slate-900/10 sm:right-6"
      role="region"
      aria-label="Notifications"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
          <p className="mt-0.5 text-xs text-slate-500">Updates from your workspace</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          {unreadCount} unread
        </span>
      </div>

      {notifications.length > 0 ? (
        <ul className="max-h-[min(26rem,calc(100dvh-12rem))] divide-y divide-slate-100 overflow-y-auto">
          {notifications.map((notification) => (
            <li key={notification.id} className={`flex gap-3 px-5 py-4 ${notification.unread ? "bg-emerald-50/40" : "bg-white"}`}>
              <span className={`mt-2 size-2 shrink-0 rounded-full ${notification.unread ? "bg-emerald-600" : "bg-slate-200"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm leading-6 ${notification.unread ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-slate-500">{notification.timeLabel}</p>
              </div>
              {notification.unread && <span className="sr-only">Unread</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true">
            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-900">All caught up</p>
          <p className="mt-1 max-w-56 text-sm leading-6 text-slate-500">New updates will appear here.</p>
        </div>
      )}
    </div>
  );
}
