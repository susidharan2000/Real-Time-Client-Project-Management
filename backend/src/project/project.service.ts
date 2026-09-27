import { QueryResult } from "pg";
import {pool} from "../db/pool.ts"

export async function fetchProjectCount(): Promise<number>{
        const res: QueryResult<any> = await pool.query(`SELECT COUNT(*)::int FROM projects;`)
        return res.rows[0].count;
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
