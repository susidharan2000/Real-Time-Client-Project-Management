BEGIN;
ALTER TABLE activity_logs ADD COLUMN project_owner_id BIGINT REFERENCES users(user_id);
ALTER TABLE activity_logs ADD COLUMN task_assignee_id BIGINT REFERENCES users(user_id);
UPDATE activity_logs a SET project_owner_id = p.created_by FROM projects p WHERE p.project_id = a.project_id;
UPDATE activity_logs a SET task_assignee_id = t.assigned_to FROM tasks t WHERE t.task_id = a.task_id;
CREATE FUNCTION capture_activity_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT created_by INTO NEW.project_owner_id FROM projects WHERE project_id = NEW.project_id;
  END IF;
  IF NEW.task_id IS NOT NULL THEN
    SELECT assigned_to INTO NEW.task_assignee_id FROM tasks WHERE task_id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER activity_scope_before_insert BEFORE INSERT ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION capture_activity_scope();
CREATE FUNCTION preserve_deleted_task_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE activity_logs SET task_assignee_id = OLD.assigned_to WHERE task_id = OLD.task_id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER task_scope_before_delete BEFORE DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION preserve_deleted_task_scope();
CREATE TABLE activity_feed_seen (
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  activity_id BIGINT NOT NULL REFERENCES activity_logs(activity_id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_id)
);
CREATE INDEX activity_logs_created_idx ON activity_logs(created_at DESC, activity_id DESC);
CREATE INDEX projects_created_by_idx ON projects(created_by);
COMMIT;
