CREATE TABLE projects (
  project_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id BIGINT NOT NULL REFERENCES clients(client_id),
  created_by BIGINT NOT NULL REFERENCES users(user_id),
  project_manager_id BIGINT REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_client_id_idx ON projects(client_id);
CREATE INDEX projects_manager_id_idx ON projects(project_manager_id);