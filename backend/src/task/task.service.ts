import { QueryResult } from "pg";
import {pool} from "../db/pool.ts"


export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type UpdatedTaskStatus = {
  task_id: string;
  status: TaskStatus;
  project_creator_id: string | null;
};

export type Task = {
  task_id: string;
  title: string;
  description: string | null;
  project_id: string;
  project_title: string;
  assigned_to_userid: string | null;
  assigned_to_user_name: string | null;
  created_by_userid: string;
  created_by_user_name: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  is_overdue: boolean;
};

export type TaskInput = {
  title: string;
  description: string | null;
  project_id: string;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
};

export type Project = {
    project_id:number
    project_title:string
}

export type UpcomingTask = {
  task_id: string;
  title: string;
  project_title: string;
  due_date: Date;
  status: TaskStatus;
}

export type AssignedUpcomingTask = {
  task_id: string;
  title: string;
  description: string | null;
  project_id: string;
  project_title: string;
  assigned_to_userid: string | null;
  assigned_to_user_name: string | null;
  created_by_userid: string;
  created_by_user_name: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  is_overdue: boolean;
}

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

export async function isTaskProjectManager(taskId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM tasks t
     JOIN projects p ON t.project_id = p.project_id
     WHERE t.task_id = $1
       AND p.created_by = $2;`,
    [taskId, userId]
  );
  return result.rows.length > 0;
}

export type User = {
  userId: string;
  userName: string;
  role: string;
};

export async function getAuthorizedUser(userId: string, allowedRoles: string[]): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT u.user_id::text AS "userId", u.user_name AS "userName", r.role_name AS role
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1
       AND r.role_name = ANY($2::text[])
       AND u.is_active = true
     LIMIT 1;`,
    [userId, allowedRoles]
  );
  return result.rows[0] ?? null;
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

export type TaskCounts = {
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

  return result.rows[0];
}


export async function fetchTask(): Promise<Task[]> {
  const res = await pool.query<Task>(`
    SELECT
      t.task_id,
      t.title,
      t.description,
      t.project_id,
      p.title AS project_title,
      t.assigned_to AS assigned_to_userid,
      assignee.user_name AS assigned_to_user_name,
      t.created_by AS created_by_userid,
      creator.user_name AS created_by_user_name,
      t.status,
      t.priority,
      t.due_date,
      COALESCE(t.due_date < NOW() AND t.status <> 'DONE', false) AS is_overdue
    FROM tasks t
    JOIN projects p ON t.project_id = p.project_id
    LEFT JOIN users assignee ON t.assigned_to = assignee.user_id
    JOIN users creator ON t.created_by = creator.user_id
    ORDER BY t.created_at DESC, t.task_id DESC;
  `);

  return res.rows;
}

export async function fetchTaskAssignees(): Promise<{ id: string; name: string }[]> {
  const res = await pool.query<{ id: string; name: string }>(`
    SELECT user_id::text AS id, user_name AS name
    FROM users u 
    JOIN roles r ON u.role_id = r.role_id
    WHERE is_active = true
    AND r.role_name NOT IN ('ADMIN','PROJECT_MANAGER')
    ORDER BY user_name, user_id;
  `);
  return res.rows;
}



export async function fetchProjectsWithTasksCreatedByMe(userId: string):Promise<Project[]>{
  const res = await pool.query<Project>(`
    SELECT p.project_id, p.title AS project_title
    FROM projects p
    WHERE EXISTS (
      SELECT 1
      FROM tasks t
      WHERE t.project_id = p.project_id
        AND p.created_by = $1
    )
    ORDER BY p.title;
  `, [userId]);
  return res.rows;
}

export async function fetchProjectsWithTasksAssignedToMe(userId: string):Promise<Project[]>{
  const res = await pool.query<Project>(`
    SELECT p.project_id, p.title AS project_title
    FROM projects p
    WHERE EXISTS (
      SELECT 1
      FROM tasks t
      WHERE t.project_id = p.project_id
        AND t.assigned_to = $1
    )
    ORDER BY p.title;
  `, [userId]);
  return res.rows;
}

export async function fetchProjectWithAtleastOneTask():Promise<Project[]>{
  const res = await pool.query(`
    SELECT p.project_id, p.title AS project_title
FROM projects p
WHERE EXISTS (
  SELECT 1
  FROM tasks t
  WHERE t.project_id = p.project_id
)
ORDER BY p.title;`);

return res.rows
}


type TaskFilters = {
  task_name?: string;
  project_id?: string;
  status?: string;
  priority?: string;
  due_from?: string;
  due_to?: string;
};

export async function searchAllTasksService(filters: TaskFilters):Promise<Task[]>{

  const res = await pool.query<Task>(
  `SELECT
     t.task_id, t.title, t.description, t.project_id,
     p.title AS project_title,
     t.assigned_to AS assigned_to_userid,
     assignee.user_name AS assigned_to_user_name,
     t.created_by AS created_by_userid,
     creator.user_name AS created_by_user_name,
     t.status, t.priority, t.due_date,
     COALESCE(t.due_date < NOW() AND t.status <> 'DONE', false) AS is_overdue
   FROM tasks t
   JOIN projects p ON t.project_id = p.project_id
   LEFT JOIN users assignee ON t.assigned_to = assignee.user_id
   JOIN users creator ON t.created_by = creator.user_id
   WHERE ($1::text IS NULL OR t.title ILIKE '%' || $1 || '%')
     AND ($2::bigint IS NULL OR t.project_id = $2)
     AND ($3::text IS NULL OR t.status = $3)
     AND ($4::text IS NULL OR t.priority = $4)
     AND ($5::date IS NULL OR t.due_date >= ($5::date::timestamp AT TIME ZONE 'UTC'))
     AND ($6::date IS NULL OR t.due_date < (($6::date + 1)::timestamp AT TIME ZONE 'UTC'))
   ORDER BY t.created_at DESC, t.task_id DESC`,
  [
    filters.task_name || null,
    filters.project_id || null,
    filters.status || null,
    filters.priority || null,
    filters.due_from || null,
    filters.due_to || null,
  ]
);
  return res.rows;
}


export async function fetchCreatedTaskCount(userId: string):Promise<number>{
  const res:QueryResult<any> = await pool.query(`SELECT COUNT(*)::int AS count FROM tasks t JOIN projects p ON p.project_id = t.project_id WHERE p.created_by = $1;`, [userId]);
  return res.rows[0].count;
}

export async function fetchCreatedOverdueTaskCount(userId: string):Promise<number>{
  const res:QueryResult<any> = await pool.query(`SELECT COUNT(*)::int AS count FROM tasks t JOIN projects p ON p.project_id = t.project_id WHERE p.created_by = $1 AND t.due_date < NOW() AND t.status <> 'DONE';`, [userId]);
  return res.rows[0].count;
}


export async function fetchCreatedTaskCountByStatus(
  userId: string,
): Promise<TaskCounts> {
  const res = await pool.query<TaskCounts>(
    `SELECT
       COUNT(*) FILTER (WHERE t.status = 'TO_DO')::int AS todo,
       COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')::int AS inprocess,
       COUNT(*) FILTER (WHERE t.status = 'IN_REVIEW')::int AS in_review,
       COUNT(*) FILTER (WHERE t.status = 'DONE')::int AS done
     FROM tasks t
     JOIN projects p ON p.project_id = t.project_id
     WHERE p.created_by = $1;`,
    [userId],
  );

  return res.rows[0];
}

export async function fetchUpcomingTaskByDueDateForManager(userId: string):Promise<UpcomingTask[]>{
  const res:QueryResult<any> = await pool.query(`
    SELECT t.task_id, t.title, p.title AS project_title, t.due_date, t.status
    FROM tasks t
    JOIN projects p ON t.project_id = p.project_id
    WHERE p.created_by = $1 AND t.due_date >= NOW() AND t.status <> 'DONE'
      AND t.due_date < ((date_trunc('week', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 week') AT TIME ZONE 'UTC')
    ORDER BY t.due_date ASC LIMIT 5;
  `,[userId]
    );
  return res.rows;
}


export async function fetchTasksCreatedByMe(filters: TaskFilters, userId: string):Promise<Task[]>{
  const res = await pool.query<Task>(
  `SELECT
     t.task_id, t.title, t.description, t.project_id,
     p.title AS project_title,
     t.assigned_to AS assigned_to_userid,
     assignee.user_name AS assigned_to_user_name,
     t.created_by AS created_by_userid,
     creator.user_name AS created_by_user_name,
     t.status, t.priority, t.due_date,
     COALESCE(t.due_date < NOW() AND t.status <> 'DONE', false) AS is_overdue
   FROM tasks t
   JOIN projects p ON t.project_id = p.project_id
   LEFT JOIN users assignee ON t.assigned_to = assignee.user_id
   JOIN users creator ON t.created_by = creator.user_id
   WHERE ($1::text IS NULL OR t.title ILIKE '%' || $1 || '%')
     AND ($2::bigint IS NULL OR t.project_id = $2)
     AND ($3::text IS NULL OR t.status = $3)
     AND ($4::text IS NULL OR t.priority = $4)
     AND p.created_by = $5
     AND ($6::date IS NULL OR t.due_date >= ($6::date::timestamp AT TIME ZONE 'UTC'))
     AND ($7::date IS NULL OR t.due_date < (($7::date + 1)::timestamp AT TIME ZONE 'UTC'))
   ORDER BY t.created_at DESC, t.task_id DESC`,
  [
    filters.task_name || null,
    filters.project_id || null,
    filters.status || null,
    filters.priority || null,
    userId,
    filters.due_from || null,
    filters.due_to || null
  ]
);
  return res.rows;
}


export async function fetchAssignedTaskCount(userId: string):Promise<number>{
  const res:QueryResult<any> = await pool.query(`SELECT COUNT(*)::int AS count FROM tasks WHERE assigned_to = $1;`, [userId]);
  return res.rows[0].count;
}

export async function fetchAssignedOverdueTaskCount(userId: string):Promise<number>{
  const res:QueryResult<any> = await pool.query(`SELECT COUNT(*)::int AS count FROM tasks WHERE assigned_to = $1 AND due_date < NOW() AND status <> 'DONE';`, [userId]);
  return res.rows[0].count;
}

export async function fetchAssignedTaskCountByStatusCount(userId: string):Promise<TaskCounts>{
  const res:QueryResult<any> = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'TO_DO')::int AS todo,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS inprocess,
      COUNT(*) FILTER (WHERE status = 'IN_REVIEW')::int AS in_review,
      COUNT(*) FILTER (WHERE status = 'DONE')::int AS done
    FROM tasks
    WHERE assigned_to = $1;
  `,[userId]);
  return res.rows[0];
}


export async function fetchUpcomingAssignedTasks(userId: string):Promise<Task[]>{
  const res = await pool.query<Task>(
    `SELECT
       t.task_id, t.title, t.description, t.project_id,
       p.title AS project_title,
       t.assigned_to AS assigned_to_userid,
       assignee.user_name AS assigned_to_user_name,
       t.created_by AS created_by_userid,
       creator.user_name AS created_by_user_name,
       t.status, 
       t.priority, 
       t.due_date,
       COALESCE(t.due_date < NOW() AND t.status <> 'DONE', false) AS is_overdue
     FROM tasks t
     JOIN projects p ON t.project_id = p.project_id
     LEFT JOIN users assignee ON t.assigned_to = assignee.user_id
     JOIN users creator ON t.created_by = creator.user_id
     WHERE t.assigned_to = $1
     AND t.status <> 'DONE'
     ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
       t.due_date ASC NULLS LAST, t.task_id DESC
     LIMIT 10;`,
    [userId]
  );
  return res.rows;
}


export async function fetchTasksAssignedToMe(userId:string,filters:TaskFilters):Promise<Task[]>{
  const res = await pool.query<Task>(
  `SELECT
     t.task_id, t.title, t.description, t.project_id,
     p.title AS project_title,
     t.assigned_to AS assigned_to_userid,
     assignee.user_name AS assigned_to_user_name,
     t.created_by AS created_by_userid,
     creator.user_name AS created_by_user_name,
     t.status, t.priority, t.due_date,
     COALESCE(t.due_date < NOW() AND t.status <> 'DONE', false) AS is_overdue
   FROM tasks t
   JOIN projects p ON t.project_id = p.project_id
   JOIN users assignee ON t.assigned_to = assignee.user_id
   JOIN users creator ON t.created_by = creator.user_id
   WHERE ($1::text IS NULL OR t.title ILIKE '%' || $1 || '%')
     AND ($2::bigint IS NULL OR t.project_id = $2)
     AND ($3::text IS NULL OR t.status = $3)
     AND ($4::text IS NULL OR t.priority = $4)
     AND t.assigned_to = $5
     AND ($6::date IS NULL OR t.due_date >= ($6::date::timestamp AT TIME ZONE 'UTC'))
     AND ($7::date IS NULL OR t.due_date < (($7::date + 1)::timestamp AT TIME ZONE 'UTC'))
   ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
       t.due_date ASC NULLS LAST, t.task_id DESC`,
  [
    filters.task_name || null,
    filters.project_id || null,
    filters.status || null,
    filters.priority || null,
    userId,
    filters.due_from || null,
    filters.due_to || null
  ]
);
  return res.rows;
}


export type CreatedTask = {
  task_id: string;
  project_id: string;
  assigned_to: string | null;
  project_creator_id: string | null;
};

export async function insertTask(task: TaskInput, userId: string, actorName: string): Promise<CreatedTask | null> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    const access = await db.query(
      `SELECT p.project_id FROM projects p
       JOIN users u ON u.user_id = $2
       JOIN roles r ON r.role_id = u.role_id
       WHERE p.project_id = $1 AND u.is_active = true
         AND (r.role_name = 'ADMIN' OR (r.role_name = 'PROJECT_MANAGER' AND p.created_by = u.user_id))
       FOR SHARE OF p;`,
      [task.project_id, userId]
    );
    if (access.rows.length === 0) {
      await db.query("ROLLBACK");
      return null;
    }

    const res = await db.query<{ task_id: string; project_id: string; assigned_to: string | null }>(
      `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date, is_overdue)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
         COALESCE($8::timestamptz < NOW() AND $6::text <> 'DONE', false))
       RETURNING task_id::text AS task_id, project_id::text AS project_id, assigned_to::text AS assigned_to;`,
      [task.title, task.description, task.project_id, task.assigned_to, userId, task.status, task.priority, task.due_date]
    );
    const createdTask = res.rows[0];

    const projectRes = await db.query<{
      project_title: string;
      project_creator_id: string | null;
      assignee_name: string | null;
    }>(
      `SELECT p.title AS project_title,
              p.created_by::text AS project_creator_id,
              assignee.user_name AS assignee_name
       FROM projects p
       LEFT JOIN users assignee ON assignee.user_id = $2
       WHERE p.project_id = $1;`,
      [createdTask.project_id, createdTask.assigned_to]
    );
    const project = projectRes.rows[0];
    if (!project) throw new Error("Task project not found");

    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs (project_id, task_id, actor_id, action, description)
       VALUES ($1, $2, $3, 'TASK_CREATED', $4)
       RETURNING activity_id::text AS id;`,
      [createdTask.project_id, createdTask.task_id, userId, `Task ${task.title} was created in project ${project.project_title}`]
    );

    const teamMessage = project.assignee_name
      ? `Task ${task.title} was assigned to ${project.assignee_name} by ${actorName} in project ${project.project_title}`
      : `Task ${task.title} was created by ${actorName} in project ${project.project_title}`;
      
    const assigneeMessage = `You were assigned task #${createdTask.task_id}: ${task.title}`;

    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1,
              CASE WHEN r.role_name = 'DEVELOPER' AND u.user_id = $4 THEN $3 ELSE $2 END
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.is_active = true
         AND u.user_id <> $5
         AND (r.role_name = 'ADMIN'
              OR (r.role_name = 'PROJECT_MANAGER' AND u.user_id = $6)
              OR (r.role_name = 'DEVELOPER' AND u.user_id = $4));`,
      [activity.rows[0].id, teamMessage, assigneeMessage, createdTask.assigned_to, userId, project.project_creator_id]
    );

    await db.query("COMMIT");
    return {
      task_id: createdTask.task_id,
      project_id: createdTask.project_id,
      assigned_to: createdTask.assigned_to,
      project_creator_id: project.project_creator_id,
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}


export type UpdatedTask = {
  task_id: string;
  project_id: string;
  assigned_to: string | null;
  assigneeChanged: boolean;
  project_creator_id: string | null;
  previous_assigned_to: string | null;
};
export async function updateTask(actorID:string,taskID: string, task: TaskInput): Promise< UpdatedTask| null> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    // Read and lock the existing task 
    const result = await db.query<TaskInput & {
      task_id: string;
      project_title: string;
      project_creator_id: string | null;
      actor_name: string;
    }>(
      `SELECT t.task_id::text AS task_id, t.title, t.description,
              t.project_id::text AS project_id,
              t.assigned_to::text AS assigned_to,
              t.status, t.priority, t.due_date,
              p.title AS project_title,
              p.created_by::text AS project_creator_id,
              actor.user_name AS actor_name
       FROM tasks t
       JOIN projects p ON p.project_id = t.project_id
       JOIN users actor ON actor.user_id = $2
       JOIN roles actor_role ON actor_role.role_id = actor.role_id
       WHERE t.task_id = $1 AND actor.is_active = true
         AND (actor_role.role_name = 'ADMIN' OR (actor_role.role_name = 'PROJECT_MANAGER' AND p.created_by = actor.user_id))
       FOR UPDATE OF t;`,
      [taskID, actorID]
    );
    const previousTask = result.rows[0];
    if (!previousTask) {
      await db.query("ROLLBACK");
      return null;
    }

    //generate JSON data to store the each change
    const changes: Record<string, { old: string | null; new: string | null }> = {};
    if (previousTask.title !== task.title) {
      changes.title = { old: previousTask.title, new: task.title };
    }
    if (previousTask.description !== task.description) {
      changes.description = { old: previousTask.description, new: task.description };
    }
    if (previousTask.assigned_to !== task.assigned_to) {
      changes.assigned_to = { old: previousTask.assigned_to, new: task.assigned_to };
    }
    if (previousTask.status !== task.status) {
      changes.status = { old: previousTask.status, new: task.status };
    }
    if (previousTask.priority !== task.priority) {
      changes.priority = { old: previousTask.priority, new: task.priority };
    }
    const previousDueDate = previousTask.due_date?.toISOString() ?? null;
    const newDueDate = task.due_date?.toISOString() ?? null;
    if (previousDueDate !== newDueDate) {
      changes.due_date = { old: previousDueDate, new: newDueDate };
    }

    if (Object.keys(changes).length === 0) {
      await db.query("COMMIT");
      return {
        task_id: previousTask.task_id,
        project_id: previousTask.project_id,
        assigned_to: previousTask.assigned_to,
        assigneeChanged:false,
        project_creator_id: previousTask.project_creator_id,
        previous_assigned_to: previousTask.assigned_to,
      };
    }

    // The task stays in its existing project.
    const res = await db.query<{ task_id: string; project_id: string; assigned_to: string | null }>(
      `UPDATE tasks
       SET title = $1, description = $2, assigned_to = $3,
           status = $4, priority = $5, due_date = $6,
           is_overdue = COALESCE($6::timestamptz < NOW() AND $4::text <> 'DONE', false),
           updated_at = NOW()
       WHERE task_id = $7
       RETURNING task_id::text AS task_id, project_id::text AS project_id,
                 assigned_to::text AS assigned_to;`,
      [task.title, task.description, task.assigned_to, task.status, task.priority, task.due_date, taskID]
    );
    const updatedTask = res.rows[0];
    if (!updatedTask) {
      await db.query("ROLLBACK");
      return null;
    }

    const changeDescription = Object.entries(changes).map(([field, change]) =>
      `${field.replaceAll("_", " ")} changed from ${change.old ?? "none"} to ${change.new ?? "none"}`
    ).join("; ");
    const message = `Task #${updatedTask.task_id}: ${task.title} was updated by ${previousTask.actor_name} in project ${previousTask.project_title}; ${changeDescription}`;

    // One activity stores all the changes from this save.
    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs (project_id, task_id, actor_id, action, changes, description)
       VALUES ($1, $2, $3, 'TASK_UPDATED', $4::jsonb, $5)
       RETURNING activity_id::text AS id;`,
      [updatedTask.project_id, updatedTask.task_id, actorID, JSON.stringify(changes), message]
    );

    // Notify admins, the project manager and affected assignees, excluding the actor.
    const assigneeChanged = changes.assigned_to !== undefined;
    const assignedMessage = `You were assigned task #${updatedTask.task_id}: ${task.title} by ${previousTask.actor_name}. ${changeDescription}`;
    const removedMessage = `You are no longer assigned to task #${updatedTask.task_id}: ${task.title}`;
    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1,
              CASE
                WHEN $7::boolean AND u.user_id = $5 THEN $8
                WHEN $7::boolean AND u.user_id = $6 THEN $9
                ELSE $2
              END
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.is_active = true
         AND u.user_id <> $3
         AND (r.role_name = 'ADMIN'
              OR u.user_id = $4
              OR u.user_id = $5
              OR ($7::boolean AND u.user_id = $6));`,
      [activity.rows[0].id, message, actorID, previousTask.project_creator_id,updatedTask.assigned_to, previousTask.assigned_to, assigneeChanged,assignedMessage, removedMessage]
    );

    await db.query("COMMIT");
    return {
      ...updatedTask,
      assigneeChanged,
      project_creator_id: previousTask.project_creator_id,
      previous_assigned_to: previousTask.assigned_to,
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}


export type DeletedTask = {
  task_id:string,
  task_name:string,
  project_id:string,
  project_creator_id:string | null,
  project_title:string
  assigned_to:string | null,
}
export async function removeTask(actorID:string,taskID: string): Promise<DeletedTask |null> {

    const db = await pool.connect();
  try{
    await db.query("BEGIN");

    const task = await db.query<DeletedTask>(
      `DELETE FROM tasks t
USING projects p
JOIN users u ON u.user_id = $2
JOIN roles r ON r.role_id = u.role_id
WHERE t.task_id = $1
  AND p.project_id = t.project_id
  AND u.is_active = true
  AND (
    r.role_name = 'ADMIN'
    OR (
      r.role_name = 'PROJECT_MANAGER'
      AND p.created_by = u.user_id
    )
  )
   RETURNING t.task_id::text AS task_id,
             t.title AS task_name,
             t.project_id::text AS project_id,
             t.assigned_to::text AS assigned_to,
             p.created_by::text AS "project_creator_id",
             p.title AS project_title;`,
      [taskID, actorID],
    );

    const deletedTask = task.rows[0];
    if (!deletedTask) {
      await db.query("ROLLBACK");
      return null;
    }

    //create activity

    const message:string = `Task #${deletedTask.task_id}: ${deletedTask.task_name} was deleted by ${actorID} in project ${deletedTask.project_title}`;
    // The task no longer exists, so its activity foreign key must be NULL.
    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs (project_id, task_id, actor_id, action, description, task_assignee_id)
       VALUES ($1, NULL, $2, 'TASK_DELETED', $3, $4)
       RETURNING activity_id::text AS id;`,
      [deletedTask.project_id, actorID, message, deletedTask.assigned_to]
    );

    //create the Notification for the 
    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1,$2
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.is_active = true
         AND u.user_id <> $3
         AND (r.role_name = 'ADMIN'
              OR (r.role_name = 'PROJECT_MANAGER' AND u.user_id = $4)
              OR (r.role_name = 'DEVELOPER' AND u.user_id = $5));`,
      [activity.rows[0].id, message,actorID,deletedTask.project_creator_id,deletedTask.assigned_to]
    );

    await db.query("COMMIT");
    return {
      ...deletedTask,
      project_creator_id: deletedTask.project_creator_id,
    };
  }catch(error){
    await db.query("ROLLBACK");
    throw error;
  }finally{
    db.release();
  }
}

export async function updateAssignedTaskStatus(actorID: string, taskID: string, previousStatus: TaskStatus, newStatus: TaskStatus): Promise<UpdatedTaskStatus | "INVALID_STATUS" | null> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await db.query<{
      title: string;
      status: TaskStatus;
      project_id: string;
      project_creator_id: string | null;
      actor_name: string;
    }>(
      `SELECT t.title, t.status, t.project_id::text AS project_id,
              p.created_by::text AS project_creator_id,
              u.user_name AS actor_name
       FROM tasks t
       JOIN projects p ON p.project_id = t.project_id
       JOIN users u ON u.user_id = t.assigned_to
       JOIN roles r ON r.role_id = u.role_id
       WHERE t.task_id = $1 AND t.assigned_to = $2
         AND u.is_active = true AND r.role_name = 'DEVELOPER'
       FOR UPDATE OF t;`,
      [taskID, actorID]
    );
    const task = result.rows[0];
    if (!task) {
      await db.query("ROLLBACK");
      return null;
    }
    if (task.status !== previousStatus) {
      await db.query("ROLLBACK");
      return "INVALID_STATUS";
    }

    await db.query(
      `UPDATE tasks SET status = $1, updated_at = NOW(),
         is_overdue = COALESCE(due_date < NOW() AND $1::text <> 'DONE', false)
       WHERE task_id = $2;`,
      [newStatus, taskID]
    );

    const changes = { status: { old: task.status, new: newStatus } };
    const message = `Task #${taskID}: ${task.title} status changed from ${task.status} to ${newStatus} by ${task.actor_name}`;
    const activity = await db.query<{ id: string }>(
      `INSERT INTO activity_logs (project_id, task_id, actor_id, action, changes, description)
       VALUES ($1, $2, $3, 'TASK_UPDATED', $4::jsonb, $5)
       RETURNING activity_id::text AS id;`,
      [task.project_id, taskID, actorID, JSON.stringify(changes), message]
    );
    await db.query(
      `INSERT INTO notifications (recipient_user_id, activity_id, message)
       SELECT u.user_id, $1, $2
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.is_active = true AND u.user_id <> $3
         AND (r.role_name = 'ADMIN' OR u.user_id = $4);`,
      [activity.rows[0].id, message, actorID, task.project_creator_id]
    );
    await db.query("COMMIT");
    return { task_id: taskID, status: newStatus, project_creator_id: task.project_creator_id };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

export type TaskPriorityCounts = {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
};

export async function fetchCreatedTaskCountByPriority(
  userId: string,
): Promise<TaskPriorityCounts> {
  const res = await pool.query<TaskPriorityCounts>(
    `SELECT
       COUNT(*) FILTER (WHERE t.priority = 'LOW')::int AS "LOW",
       COUNT(*) FILTER (WHERE t.priority = 'MEDIUM')::int AS "MEDIUM",
       COUNT(*) FILTER (WHERE t.priority = 'HIGH')::int AS "HIGH",
       COUNT(*) FILTER (WHERE t.priority = 'CRITICAL')::int AS "CRITICAL"
     FROM tasks t
     JOIN projects p ON p.project_id = t.project_id
     WHERE p.created_by = $1;`,
    [userId],
  );

  return res.rows[0];
}

export type OverdueTask = {
  task_id: string;
  project_creator_id: string;
  assigned_to: string | null;
};

export async function markOverdueTasks(): Promise<OverdueTask[]> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    // Lock a batch so another scheduler or task edit cannot process it at once.
    const result = await db.query<OverdueTask & {
      title: string;
      project_id: string;
      project_title: string;
      due_date: Date;
    }>(
      `SELECT t.task_id::text AS task_id, t.title,
              t.project_id::text AS project_id,
              t.assigned_to::text AS assigned_to, t.due_date,
              p.created_by::text AS project_creator_id,
              p.title AS project_title
       FROM tasks t
       JOIN projects p ON p.project_id = t.project_id
       WHERE t.due_date < NOW()
         AND t.status <> 'DONE'
         AND t.overdue_notified_due_date IS DISTINCT FROM t.due_date
       ORDER BY t.due_date, t.task_id
       LIMIT 100
       FOR UPDATE OF t SKIP LOCKED;`
    );

    const processedTasks: OverdueTask[] = [];
    for (const task of result.rows) {
      await db.query(
        `UPDATE tasks
         SET is_overdue = true, overdue_notified_due_date = due_date,
             updated_at = NOW()
         WHERE task_id = $1;`,
        [task.task_id]
      );

      const message = `Task #${task.task_id}: ${task.title} in project ${task.project_title} is overdue`;
      const changes = { due_date: task.due_date.toISOString(), detected_by: "SYSTEM" };
      const activity = await db.query<{ id: string }>(
        `INSERT INTO activity_logs (project_id, task_id, actor_id, action, changes, description)
         VALUES ($1, $2, NULL, 'TASK_OVERDUE', $3::jsonb, $4)
         RETURNING activity_id::text AS id;`,
        [task.project_id, task.task_id, JSON.stringify(changes), message]
      );

      // There is no user actor to exclude from a scheduled notification.
      await db.query(
        `INSERT INTO notifications (recipient_user_id, activity_id, message)
         SELECT u.user_id, $1, $2
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.is_active = true
           AND (r.role_name = 'ADMIN'
                OR u.user_id = $3
                OR u.user_id = $4);`,
        [activity.rows[0].id, message, task.project_creator_id, task.assigned_to]
      );
      processedTasks.push({
        task_id: task.task_id,
        project_creator_id: task.project_creator_id,
        assigned_to: task.assigned_to,
      });
    }

    await db.query("COMMIT");
    return processedTasks;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
