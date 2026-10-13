import { QueryResult } from "pg";
import { pool } from "../db/pool";


export async function isAuthorized(userId: string, allowedRoles: string[]): Promise<boolean> {
  const result: QueryResult<any> = await pool.query(
    `SELECT 1
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1
       AND r.role_name = ANY($2::text[])
       AND u.is_active = true
     LIMIT 1;`,
    [userId, allowedRoles]
  );

  return result.rows.length > 0;
}

export type Activity = {
  activity_id: string;
  client_id: string | null;
  client_name: string | null;
  project_id: string | null;
  project_title: string | null;
  task_id: string | null;
  task_title: string | null;
  actor_id: string | null;
  actor_name: string;
  action: string;
  changes: Record<string, unknown> | null;
  description: string;
  created_at: Date;
  is_missed: boolean;
};

const visibleActivity = `EXISTS (
  SELECT 1 FROM users viewer JOIN roles r ON r.role_id = viewer.role_id
  WHERE viewer.user_id = $1 AND viewer.is_active = true AND (
    r.role_name = 'ADMIN'
    OR (r.role_name = 'PROJECT_MANAGER' AND COALESCE(p.created_by, a.project_owner_id) = viewer.user_id)
    OR (r.role_name = 'DEVELOPER' AND
      CASE WHEN t.task_id IS NOT NULL THEN t.assigned_to ELSE a.task_assignee_id END = viewer.user_id)
  )
)`;

export async function fetchMyActivityFeed(userId: string, afterActivityId: string | null = null, missedOnly = false): Promise<Activity[]> {
  const res = await pool.query<Activity>(
    `SELECT a.activity_id::text AS activity_id,
       a.client_id::text AS client_id, c.client_name,
       a.project_id::text AS project_id, p.title AS project_title,
       a.task_id::text AS task_id, t.title AS task_title,
       a.actor_id::text AS actor_id, COALESCE(actor.user_name, 'System') AS actor_name,
       a.action, a.changes, a.description, a.created_at,
       seen.activity_id IS NULL AS is_missed
     FROM activity_logs a
     LEFT JOIN activity_feed_seen seen ON seen.activity_id = a.activity_id AND seen.user_id = $1
     LEFT JOIN users actor ON actor.user_id = a.actor_id
     LEFT JOIN clients c ON c.client_id = a.client_id
     LEFT JOIN projects p ON p.project_id = a.project_id
     LEFT JOIN tasks t ON t.task_id = a.task_id
     WHERE ($2::bigint IS NULL OR a.activity_id > $2)
       AND ($3::boolean = false OR seen.activity_id IS NULL)
       AND ${visibleActivity}
     ORDER BY a.created_at DESC, a.activity_id DESC
     LIMIT 20;`,
    [userId, afterActivityId, missedOnly]
  );
  return res.rows;
}

export async function markActivityFeedSeen(userId: string, activityIds: string[]): Promise<void> {
  await pool.query(
    `INSERT INTO activity_feed_seen (user_id, activity_id)
     SELECT $1, a.activity_id FROM activity_logs a
     LEFT JOIN projects p ON p.project_id = a.project_id
     LEFT JOIN tasks t ON t.task_id = a.task_id
     WHERE a.activity_id = ANY($2::bigint[]) AND ${visibleActivity}
     ON CONFLICT (user_id, activity_id) DO NOTHING;`,
    [userId, activityIds]
  );
}
