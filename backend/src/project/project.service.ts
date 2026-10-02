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

type Projects = {
  title: string;
  description: string;
  client_id: number;
  client_name: string;
  created_by_id: number;
  created_by: string;
  project_manager_id:number | null;
  project_manager: string | null;
}
export async function fetchAllProject(): Promise<Projects[]> {
  const res = await pool.query<Projects>(`
    SELECT
      p.project_id,
      p.title,
      p.description,
      p.client_id,
      c.client_name,
      p.created_by AS created_by_id,
      creator.user_name AS created_by,
      p.project_manager_id,
      manager.user_name AS project_manager
    FROM projects p
    JOIN clients c ON p.client_id = c.client_id
    JOIN users creator ON p.created_by = creator.user_id
    LEFT JOIN users manager ON p.project_manager_id = manager.user_id;
  `);
  return res.rows;
}

export async function fetchMyProjects(userId: string): Promise<Projects[]> {
  const res = await pool.query<Projects>(`
    SELECT
      p.project_id,
      p.title,
      p.description,
      p.client_id,
      c.client_name,
      p.created_by AS created_by_id,
      creator.user_name AS created_by,
      p.project_manager_id,
      manager.user_name AS project_manager
    FROM projects p
    JOIN clients c ON p.client_id = c.client_id
    JOIN users creator ON p.created_by = creator.user_id
    LEFT JOIN users manager ON p.project_manager_id = manager.user_id
    WHERE p.project_manager_id = $1 OR p.created_by = $1;
  `, [userId]);
  return res.rows;
}

type ProjectRow = {
  project_id: string;
  title: string;
  description: string | null;
  client_id: string;
  created_by: string;
  project_manager_id: string | null;
  created_at: Date;
};

export async function fetchProjectManagers(): Promise<{ id: string; name: string }[]> {
  const res = await pool.query<{ id: string; name: string }>(`
    SELECT u.user_id::text AS id, u.user_name AS name
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE r.role_name = 'PROJECT_MANAGER'
      AND u.is_active = true
    ORDER BY u.user_name, u.user_id;
  `);
  return res.rows;
}

export async function insertProject(title: string, description: string | null, clientId: string, createdBy: string, managerId: string | null): Promise<ProjectRow> {
  const res = await pool.query<ProjectRow>(
    `INSERT INTO projects (title, description, client_id, created_by, project_manager_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING project_id, title, description, client_id, created_by, project_manager_id, created_at;`,
    [title, description, clientId, createdBy, managerId]
  );
  return res.rows[0];
}

export async function updateProject(id: string, title: string, description: string | null, clientId: string, managerId: string | null, userId: string): Promise<ProjectRow | null> {
  const res = await pool.query<ProjectRow>(
    `UPDATE projects
     SET title = $1, description = $2, client_id = $3, project_manager_id = $4
     WHERE project_id = $5
       AND (created_by = $6 OR EXISTS (
         SELECT 1 FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = $6
           AND r.role_name = 'ADMIN'
           AND u.is_active = true
       ))
     RETURNING project_id, title, description, client_id, created_by, project_manager_id, created_at;`,
    [title, description, clientId, managerId, id, userId]
  );
  return res.rows[0] ?? null;
}

export async function removeProject(id: string, userId: string): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM projects
     WHERE project_id = $1
       AND (created_by = $2 OR EXISTS (
         SELECT 1 FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = $2
           AND r.role_name = 'ADMIN'
           AND u.is_active = true
       ))
     RETURNING project_id;`,
    [id, userId]
  );

  return res.rows.length > 0;
}


export async function fetchManagedProjectCount(userId: string): Promise<number> {
  const res: QueryResult<any> = await pool.query(`
                               SELECT COUNT(*):: int AS count
                               FROM projects
                               WHERE project_manager_id = $1 OR created_by = $1;
                             `, [userId]);
  return res.rows[0].count;
}
