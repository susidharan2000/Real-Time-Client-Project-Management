BEGIN;

-- Task edits can set is_overdue before the scheduler processes the deadline.
ALTER TABLE tasks ADD COLUMN overdue_notified_due_date TIMESTAMPTZ;

CREATE INDEX tasks_pending_overdue_idx ON tasks(due_date, task_id)
  WHERE status <> 'DONE'
    AND due_date IS NOT NULL
    AND overdue_notified_due_date IS DISTINCT FROM due_date;


ALTER TABLE activity_logs ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_actor_required
  CHECK (actor_id IS NOT NULL OR action = 'TASK_OVERDUE');

COMMIT;
