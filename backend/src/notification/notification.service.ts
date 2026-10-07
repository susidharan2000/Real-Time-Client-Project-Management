import { QueryResult } from "pg";
import { pool } from "../db/pool";
type Notification = {
  notification_id:string,
  message:string,
  created_at:string,
  read_at:string
}

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


export async function fetchMyNotifications(userID: string): Promise<Notification[]> {
  const res = await pool.query<Notification>(
    `SELECT notification_id::text AS notification_id,
            message, created_at, read_at
     FROM notifications
     WHERE recipient_user_id = $1
     AND read_at IS NULL
     ORDER BY created_at DESC, notification_id DESC
     LIMIT 20`,
    [userID]
  );

  return res.rows;
}