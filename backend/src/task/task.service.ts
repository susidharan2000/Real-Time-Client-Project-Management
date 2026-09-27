import { QueryResult } from "pg";
import {pool} from "../db/pool.ts"

export async function fetchTaskCount(): Promise<number> {
  const result = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM tasks;"
  );

  return result.rows[0].count;
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

export async function fetchOverDueTaskCount(): Promise<number> {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM tasks
     WHERE due_date < NOW()
       AND status <> 'DONE';`
  );

  return result.rows[0].count;
}

type TaskCounts = {
  todo: number;
  inprocess: number;
  in_review: number;
  done: number;
};

export async function fetchTaskCountbyStatus(): Promise<TaskCounts> {
  const result = await pool.query<TaskCounts>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'TO_DO')::int AS todo,
       COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS inprocess,
       COUNT(*) FILTER (WHERE status = 'IN_REVIEW')::int AS in_review,
       COUNT(*) FILTER (WHERE status = 'DONE')::int AS done
     FROM tasks;`
  );
  //console.log(result)

  return result.rows[0];
}
