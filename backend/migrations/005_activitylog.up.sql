CREATE TABLE activity_logs (
  activity_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id BIGINT REFERENCES clients(client_id) ON DELETE SET NULL,
  project_id BIGINT REFERENCES projects(project_id) ON DELETE SET NULL,
  task_id BIGINT REFERENCES tasks(task_id) ON DELETE SET NULL,
  actor_id BIGINT NOT NULL REFERENCES users(user_id),
  action TEXT NOT NULL
    CHECK (action IN (
      'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED',
      'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
      'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_DELETED',
      'STATUS_CHANGED', 'TASK_OVERDUE'
    )),
  old_status TEXT,
  new_status TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_client_created_idx
  ON activity_logs(client_id, created_at DESC);
CREATE INDEX activity_logs_project_created_idx
  ON activity_logs(project_id, created_at DESC);
CREATE INDEX activity_logs_task_created_idx
  ON activity_logs(task_id, created_at DESC);
