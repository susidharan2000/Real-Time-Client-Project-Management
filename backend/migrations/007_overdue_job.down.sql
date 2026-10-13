BEGIN;

-- This rollback requires system activities to be resolved first; never delete
-- audit history or assign it to an arbitrary user to satisfy NOT NULL.
ALTER TABLE activity_logs ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_actor_required;
DROP INDEX tasks_pending_overdue_idx;
ALTER TABLE tasks DROP COLUMN overdue_notified_due_date;

COMMIT;
