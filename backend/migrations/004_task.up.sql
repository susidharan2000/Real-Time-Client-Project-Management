CREATE TABLE tasks (
  task_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to BIGINT REFERENCES users(user_id),
  created_by BIGINT NOT NULL REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'TO_DO'
    CHECK (status IN ('TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  due_date TIMESTAMPTZ,
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_project_id_idx ON tasks(project_id);
CREATE INDEX tasks_assigned_to_idx ON tasks(assigned_to);
CREATE INDEX tasks_status_priority_due_idx ON tasks(status, priority, due_date);
CREATE INDEX tasks_due_for_scheduler_idx
  ON tasks(due_date)
  WHERE is_overdue = FALSE AND status <> 'DONE';