import { API_URL } from "../api";
import { useEffect, useState } from "react";
import axios from "axios";
import type { Socket } from "socket.io-client";

type Activity = {
  activity_id: string;
  project_title: string | null;
  task_id: string | null;
  actor_name: string;
  action: string;
  changes: Record<string, unknown> | null;
  description: string;
  created_at: string;
  is_missed: boolean;
};

type ActivityFeedProps = {
  accessToken: string;
  socket: Socket | null;
  role: string;
};

function activityMessage(activity: Activity) {
  const status = activity.changes?.status;
  if (Object.keys(activity.changes ?? {}).length === 1 && status && typeof status === "object" && "old" in status && "new" in status
      && typeof status.old === "string" && typeof status.new === "string") {
    const labels: Record<string, string> = {
      TO_DO: "To do", IN_PROGRESS: "In progress", IN_REVIEW: "In review", DONE: "Done",
    };
    return `${activity.actor_name} moved Task #${activity.task_id ?? "—"} from ${labels[status.old] ?? status.old} → ${labels[status.new] ?? status.new}`;
  }
  return activity.description;
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  return formatter.format(-Math.floor(seconds / 86400), "day");
}

export default function ActivityFeed({ accessToken, socket, role }: ActivityFeedProps) {
  const URL = API_URL;
  const [activities,setActivities] = useState<Activity[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [refresh,setRefresh] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let controller: AbortController | null = null;
    async function fetchActivityFeed() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setError("");
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` }, signal: request.signal };
        const [latest, missed] = await Promise.all([
          axios.get<{ activities: Activity[] }>(`${URL}/activity`, config),
          axios.get<{ activities: Activity[] }>(`${URL}/activity`, { ...config, params: { missed: "true" } }),
        ]);
        if (request.signal.aborted) return;
        const merged = new Map<string, Activity>();
        for (const activity of [...latest.data.activities, ...missed.data.activities]) merged.set(activity.activity_id, activity);
        setActivities([...merged.values()].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || (BigInt(a.activity_id) < BigInt(b.activity_id) ? 1 : -1)
        ));
      } catch (error) {
        if (request.signal.aborted) return;
        console.error("Failed to fetch activity feed:", error);
        setError("Could not load activity. Please try again.");
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    }

    // Read the latest history on mount/reconnect and after relevant live events.
    const refreshActivityFeed = () => { void fetchActivityFeed(); };
    refreshActivityFeed();
    const events = ["connect", "activity:created", "notification:created", "project:created", "project:updated", "project:deleted", "project:assigned", "project:manager-removed", "task:created", "task:updated", "task:deleted", "task:assigned", "task:removed", "client:created", "client:updated", "client:deleted"];
    for (const event of events) socket?.on(event, refreshActivityFeed);
    return () => {
      controller?.abort();
      for (const event of events) socket?.off(event, refreshActivityFeed);
    };
  }, [accessToken, socket, refresh]);

  // Remember the displayed records in PostgreSQL, independently of notification read state.
  useEffect(() => {
    const activityIds = activities.filter(activity => activity.is_missed).map(activity => activity.activity_id);
    if (!accessToken || activityIds.length === 0) return;
    const controller = new AbortController();
    axios.post(`${URL}/activity/seen`, { activityIds }, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
    }).catch(error => {
      if (!controller.signal.aborted) {
        console.error("Could not save activity catch-up:", error);
        setError("Activity loaded, but reading progress could not be saved. Please try again.");
      }
    });
    return () => controller.abort();
  }, [activities, accessToken]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="activity-feed-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 id="activity-feed-title" className="text-lg font-semibold">{role === "ADMIN" ? "Global activity" : role === "DEVELOPER" ? "My task activity" : "Team activity"}</h2>
          <p className="mt-1 text-sm text-slate-500">Latest updates and up to 20 missed events from your authorized workspace.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          <span className={`size-1.5 rounded-full ${socket?.connected ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />
          {socket?.connected ? "Live updates" : "Reconnecting"}
        </span>
      </div>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-red-50 px-6 py-3 text-sm text-red-700">
        {error}<button type="button" onClick={() => setRefresh(current => current + 1)} className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold hover:bg-red-100">Try again</button>
      </div>}
      {loading ? <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Loading activity…</p>
        : activities.length === 0 && !error ? <div className="px-6 py-12 text-center">
          <p className="font-semibold text-slate-800">No activity yet</p>
          <p className="mt-2 text-sm text-slate-500">Project and task updates will appear here.</p>
        </div>
        : <ol className="max-h-[36rem] divide-y divide-slate-100 overflow-y-auto">
          {activities.map(activity => (
            <li key={activity.activity_id} className="flex gap-4 px-5 py-5 sm:px-6">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800">{activity.actor_name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{activity.actor_name}{activity.is_missed && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">New</span>}</p>
                  <time dateTime={activity.created_at} title={new Date(activity.created_at).toLocaleString()} className="text-xs text-slate-500">{relativeTime(activity.created_at)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{activityMessage(activity)}</p>
                {activity.project_title && <p className="mt-2 text-xs font-medium text-emerald-800">{activity.project_title}</p>}
              </div>
            </li>
          ))}
        </ol>}
    </section>
  );
}
