import { QueryResult } from "pg";
import {pool} from "../db/pool.ts"

export async function fetchProjectCount(): Promise<number>{
        const res: QueryResult<any> = await pool.query(`SELECT COUNT(*)::int FROM projects;`)
        return res.rows[0].count;
}

export async function isAuthorized(userId: string, allowedRoles: string[]): Promise<boolean> {
  return (await getAuthorizedRole(userId, allowedRoles)) !== null;
}

export async function getAuthorizedRole(userId: string, allowedRoles: string[]): Promise<string | null> {
  const result = await pool.query<{ role: string }>(
    `SELECT r.role_name AS role
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1
       AND r.role_name = ANY($2::text[])
       AND u.is_active = true
     LIMIT 1;`,
    [userId, allowedRoles]
  );
  return result.rows[0]?.role ?? null;
}

type AuthorizedUser = {
  userId: string;
  userName: string;
  role: string;
};

export async function getAuthorizedUser(userId: string): Promise<AuthorizedUser | null> {
  const result = await pool.query<AuthorizedUser>(
    `SELECT u.user_id::text AS "userId", u.user_name AS "userName", r.role_name AS role
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1
       AND u.is_active = true
     LIMIT 1;`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export type Project = {
  title: string;
  description: string;
  client_id: number;
  client_name: string;
  created_by_id: number;
  created_by: string;
  project_manager_id:number | null;
  project_manager: string | null;
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

export async function fetchAllProject(): Promise<Project[]> {
  const res = await pool.query<Project>(`
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

export async function fetchMyProjects(userId: string): Promise<Project[]> {
  const res = await pool.query<Project>(`
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
    WHERE p.created_by = $1 OR  p.project_manager_id = $1;
  `, [userId]);
  return res.rows;
}

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

export async function fetchProjectManager(id: string): Promise<string | null> {
  const res = await pool.query<{ project_manager_id: string | null }>(
    `SELECT project_manager_id::text AS project_manager_id
     FROM projects
     WHERE project_id = $1;`,
    [id]
  );
  return res.rows[0]?.project_manager_id ?? null;
}

export async function insertProject(actorID:string,actorName:string, title: string, description: string | null, clientId: string, createdBy: string, managerId: string | null): Promise<ProjectRow> {
  const db = await pool.connect();
  try{
    await db.query("BEGIN")
    const res = await db.query<ProjectRow>(
    `INSERT INTO projects (title, description, client_id, created_by, project_manager_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING project_id, title, description, client_id, created_by, project_manager_id, created_at;`,
    [title, description, clientId, createdBy, managerId]
  );
  const project:ProjectRow =  res.rows[0];
  //insert the Activity
  const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs
         (project_id, actor_id, action, description)
       VALUES ($1, $2, 'PROJECT_CREATED', $3)
       RETURNING activity_id::text AS id`,
      [project.project_id, actorID, `Project${project.title} was created`]
    );
  //creat the Notification
  const adminMessage:string = `Project ${project.title} was created by ${actorName}`; 
  await db.query(
  `INSERT INTO notifications (recipient_user_id, activity_id, message)
   SELECT u.user_id, $1, $2
   FROM users u
   JOIN roles r ON r.role_id = u.role_id
   WHERE (r.role_name = 'ADMIN' OR u.user_id = $3)
     AND u.is_active = true
     AND u.user_id <> $4`,
  [activity.rows[0].id, adminMessage, createdBy, actorID]
);
  await db.query("COMMIT");
  return project
  }catch(error){
    await db.query("ROLLBACK");
    throw error;
  }finally{
    db.release();
  }
}


export type UpdateProjectResult = {
  project: ProjectRow;
  previousProjectManagerID: string | null;
};
export async function updateProject(
  actorID: string,
  actorName:string,
  project_id: string,
  title: string,
  description: string | null,
  clientId: string,
  managerId: string | null,
  userId: string,
): Promise<UpdateProjectResult | null> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    //read the Old Project Manager
    const result = await db.query<{ project_manager_id: string | null }>(
    `SELECT project_manager_id::text AS project_manager_id
     FROM projects
     WHERE project_id = $1
     FOR UPDATE;`,
    [project_id]
  );
  const previousProjectManagerID =  result.rows[0]?.project_manager_id ?? null;

    const res = await db.query<ProjectRow>(
      `UPDATE projects p
     SET title = $1, description = $2, client_id = $3, project_manager_id = $4
     WHERE project_id = $5
       AND EXISTS (
         SELECT 1 FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = $6
           AND (
           r.role_name = 'ADMIN' 
           OR (r.role_name = 'PROJECT_MANAGER' AND p.created_by = $6)
           )
           AND u.is_active = true
       )
     RETURNING project_id, title, description, client_id, created_by, project_manager_id, created_at;`,
      [title, description, clientId, managerId, project_id, userId],
    );
    const project: ProjectRow | null = res.rows[0] ?? null;
    if (!project) {
      await db.query("ROLLBACK");
      return null;
    }
    //insert the Activity
    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs
         (project_id, actor_id, action, description)
       VALUES ($1, $2, 'PROJECT_UPDATED', $3)
       RETURNING activity_id::text AS id`,
      [project.project_id, actorID, `Project ${project.title} was updated`],
    );

    const message = `Project ${project.title} was updated by ${actorName}`;
    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1, $2 FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.is_active = true AND u.user_id <> $3
         AND (r.role_name = 'ADMIN' OR u.user_id = $4);`,
      [activity.rows[0].id, message, actorID, project.created_by]
    );
    await db.query("COMMIT");

    return {
      project: project,
       previousProjectManagerID: previousProjectManagerID
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}


export type deletedResponse = {
  project:ProjectRow
}
export async function removeProject(id: string, actorID: string,actorName:string): Promise<deletedResponse | null> {

  const db = await pool.connect();
  try{
    await db.query("BEGIN");
      const res = await db.query(
    `DELETE FROM projects p
WHERE p.project_id = $1
  AND EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = $2
      AND u.is_active = true
      AND (
        r.role_name = 'ADMIN'
        OR (r.role_name = 'PROJECT_MANAGER'
            AND p.created_by = $2)
      )
  )
RETURNING p.project_id, p.title, p.description, p.client_id, p.created_by, p.project_manager_id, p.created_at;`,
    [id, actorID]
  );
  const  DeletedProject:ProjectRow = res.rows[0];

  if (!DeletedProject){
    await db.query("ROLLBACK");
    return null
  }

  //insert the Activity
    const activity = await db.query<{ id: string }>(
  `INSERT INTO activity_logs
     (project_id, actor_id, action, description, project_owner_id)
   VALUES (NULL, $1, 'PROJECT_DELETED', $2, $3)
   RETURNING activity_id::text AS id`,
  [actorID, `Project ${DeletedProject.title} (ID ${DeletedProject.project_id}) was deleted`, DeletedProject.created_by],
);

  //creat the Notification
  const message = `Project ${DeletedProject.title} was deleted by ${actorName}`;

await db.query(
  `INSERT INTO notifications (recipient_user_id, activity_id, message)
   SELECT u.user_id, $1, $2
   FROM users u
   JOIN roles r ON r.role_id = u.role_id
   WHERE (r.role_name = 'ADMIN' OR u.user_id = $4)
     AND u.is_active = true
     AND u.user_id <> $3`,
  [activity.rows[0].id, message, actorID, DeletedProject.created_by]
);
  await db.query("COMMIT")
  return {
    project:DeletedProject
  }
  }catch(error){
    await db.query("ROLLBACK");
    throw error;
  }finally{
    db.release();
  }

}


export async function fetchManagedProjectCount(userId: string): Promise<number> {
  const res: QueryResult<any> = await pool.query(`
                               SELECT COUNT(*):: int AS count
                               FROM projects
                               WHERE created_by = $1;
                             `, [userId]);
  return res.rows[0].count;
}
