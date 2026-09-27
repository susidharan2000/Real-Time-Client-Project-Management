CREATE TABLE activity_logs (
  activity_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  actor_id BIGINT NOT NULL REFERENCES users(user_id),
  action TEXT NOT NULL
    CHECK (action IN ('TASK_ASSIGNED', 'STATUS_CHANGED', 'TASK_OVERDUE')),
  old_status TEXT,
  new_status TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_project_created_idx
  ON activity_logs(project_id, created_at DESC);
CREATE INDEX activity_logs_task_created_idx
  ON activity_logs(task_id, created_at DESC);
