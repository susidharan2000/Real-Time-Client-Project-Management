import { QueryResult } from "pg";
import { pool } from "../db/pool.ts";

export async function fetchClientCount(): Promise<number> {
  const result = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM clients;"
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

type Client = {
  id: string;
  name: string;
  email: string | null;
};

export async function fetchClients(): Promise<(Client & { projectCount: number })[]> {
  const result = await pool.query<Client & { projectCount: number }>(
    `SELECT c.client_id::text AS id, c.client_name AS name, c.email,
            COUNT(p.project_id)::int AS "projectCount"
     FROM clients c
     LEFT JOIN projects p ON p.client_id = c.client_id
     GROUP BY c.client_id
     ORDER BY c.created_at DESC, c.client_id DESC;`
  );
  return result.rows;
}

export async function insertClient(name: string, email: string | null): Promise<Client> {
  const result = await pool.query<Client>(
    `INSERT INTO clients (client_name, email)
     VALUES ($1, $2)
     RETURNING client_id::text AS id, client_name AS name, email;`,
    [name, email]
  );
  return result.rows[0];
}

export async function updateClient(id: string, name: string, email: string | null): Promise<Client | null> {
  const result = await pool.query<Client>(
    `UPDATE clients
     SET client_name = $1, email = $2
     WHERE client_id = $3
     RETURNING client_id::text AS id, client_name AS name, email;`,
    [name, email, id]
  );
  return result.rows[0] ?? null;
}

export async function removeClient(id: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM clients WHERE client_id = $1 RETURNING client_id;",
    [id]
  );
  return result.rows.length > 0;
}
