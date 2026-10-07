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

export type Client = {
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

export async function insertClient(actorID:string,name: string, email: string | null): Promise<Client> {
  const db = await pool.connect();
  try{

    await db.query("BEGIN");
    const result = await db.query<Client>(
    `INSERT INTO clients (client_name, email)
     VALUES ($1, $2)
     RETURNING client_id::text AS id, client_name AS name, email;`,
    [name, email]
  );
  const client = result.rows[0];

  const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs
         (client_id, actor_id, action, description)
       VALUES ($1, $2, 'CLIENT_CREATED', $3)
       RETURNING activity_id::text AS id`,
      [client.id, actorID, `Client ${client.name} was created`]
    );

  await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1, $2
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE r.role_name = 'ADMIN'
         AND u.is_active = true
         AND u.user_id <> $3`,
      [activity.rows[0].id, `Client ${client.name} was created by ${actorID}`, actorID]
    );
  await db.query("COMMIT");
  return client;
  }catch(error){
    await db.query("ROLLBACK");
    throw error;
  }finally{
    db.release();
  }
}

export async function updateClient(actorID:string,id: string, name: string, email: string | null): Promise<Client | null> {
  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const result = await db.query<Client>(
      `UPDATE clients
     SET client_name = $1, email = $2
     WHERE client_id = $3
     RETURNING client_id::text AS id, client_name AS name, email;`,
      [name, email, id],
    );
    const client = result.rows[0] ?? null;

    if(client === null){
      await db.query("ROLLBACK");
      return null;
    }

    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs
         (client_id, actor_id, action, description)
       VALUES ($1, $2, 'CLIENT_UPDATED', $3)
       RETURNING activity_id::text AS id`,
      [client.id, actorID, `Client ${client.name} was Updated`]
    );

    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1, $2
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE r.role_name = 'ADMIN'
         AND u.is_active = true
         AND u.user_id <> $3`,
      [activity.rows[0].id, `Client ${client.name} was updated by ${actorID}`, actorID]
    );

    await db.query("COMMIT");
    return client;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

export async function removeClient(actorID: string,id: string): Promise<boolean> {
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    const result = await db.query<{ client_name: string }>(
      "DELETE FROM clients WHERE client_id = $1 RETURNING client_name;",
      [id],
    );
    if (result.rows.length === 0) {
      await db.query("ROLLBACK");
      return false;
    }
    const client_name: string = result.rows[0].client_name;

    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs
         (actor_id, action, description)
       VALUES ($1,'CLIENT_DELETED',$2)
       RETURNING activity_id::text AS id`,
      [actorID, `Client ${client_name} was Deleted`],
    );
    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1, $2
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE r.role_name = 'ADMIN'
         AND u.is_active = true
         AND u.user_id <> $3`,
      [
        activity.rows[0].id,
        `Client ${client_name} was Deleted by ${actorID}`,
        actorID,
      ],
    );

    await db.query("COMMIT");
    return true;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
