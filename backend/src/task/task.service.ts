import { QueryResult } from "pg";
import {pool} from "../db/pool.ts"


export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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

export async function insertTask(task: TaskInput, userId: string): Promise<{ task_id: string }> {
  const res = await pool.query<{ task_id: string }>(
    `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date, is_overdue)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
       COALESCE($8::timestamptz < NOW() AND $6::text <> 'DONE', false))
     RETURNING task_id;`,
    [task.title, task.description, task.project_id, task.assigned_to, userId, task.status, task.priority, task.due_date]
  );
  return res.rows[0];
}

export async function updateTask(id: string, task: TaskInput): Promise<{ task_id: string } | null> {
  const res = await pool.query<{ task_id: string }>(
    `UPDATE tasks
     SET title = $1, description = $2, project_id = $3, assigned_to = $4,
         status = $5, priority = $6, due_date = $7,
         is_overdue = COALESCE($7::timestamptz < NOW() AND $5::text <> 'DONE', false),
         updated_at = NOW()
     WHERE task_id = $8
     RETURNING task_id;`,
    [task.title, task.description, task.project_id, task.assigned_to, task.status, task.priority, task.due_date, id]
  );
  return res.rows[0] ?? null;
}

export async function removeTask(id: string): Promise<boolean> {
  const res = await pool.query("DELETE FROM tasks WHERE task_id = $1 RETURNING task_id;", [id]);
  return res.rows.length > 0;
}

export async function fetchProjectsWithTasksCreatedByMe(userId: string):Promise<Project[]>{
  const res = await pool.query<Project>(`
    SELECT p.project_id, p.title AS project_title
    FROM projects p
    WHERE EXISTS (
      SELECT 1
      FROM tasks t
      WHERE t.project_id = p.project_id
        AND t.created_by = $1
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
   ORDER BY t.created_at DESC, t.task_id DESC`,
  [
    filters.task_name || null,
    filters.project_id || null,
    filters.status || null,
    filters.priority || null,
  ]
);
  return res.rows;
}


export async function fetchCreatedTaskCount(userId: string):Promise<number>{
  const res:QueryResult<any> = await pool.query(`SELECT COUNT(*)::int AS count FROM tasks WHERE created_by = $1;`, [userId]);
  return res.rows[0].count;
}

export async function fetchCreatedOverdueTaskCount(userId: string):Promise<number>{
  const res:QueryResult<any> = await pool.query(`SELECT COUNT(*)::int AS count FROM tasks WHERE created_by = $1 AND due_date < NOW() AND status <> 'DONE';`, [userId]);
  return res.rows[0].count;
}


export async function fetchCreatedTaskCountByStatus(userId: string):Promise<TaskCounts>{
  const res:QueryResult<any> = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'TO_DO')::int AS todo,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS inprocess,
      COUNT(*) FILTER (WHERE status = 'IN_REVIEW')::int AS in_review,
      COUNT(*) FILTER (WHERE status = 'DONE')::int AS done
    FROM tasks
    WHERE created_by = $1;
    `,[userId]);
    return res.rows[0];

}

export async function fetchUpcomingTaskByDueDateForManager(userId: string):Promise<UpcomingTask[]>{
  const res:QueryResult<any> = await pool.query(`
    SELECT t.task_id, t.title, p.title AS project_title, t.due_date, t.status
    FROM tasks t
    JOIN projects p ON t.project_id = p.project_id
    WHERE t.created_by = $1 AND t.due_date > NOW() AND t.status <> 'DONE'
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
     AND t.created_by = $5
   ORDER BY t.created_at DESC, t.task_id DESC`,
  [
    filters.task_name || null,
    filters.project_id || null,
    filters.status || null,
    filters.priority || null,
    userId
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
     ORDER BY t.created_at DESC, t.task_id DESC
     LIMIT 10;`,
    [userId]
  );
  return res.rows;
}


export async function fetchTasksAssignedToMe(userId:string,filters:any):Promise<Task[]>{
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
   ORDER BY t.created_at DESC, t.task_id DESC`,
  [
    filters.task_name || null,
    filters.project_id || null,
    filters.status || null,
    filters.priority || null,
    userId
  ]
);
  return res.rows;
}
