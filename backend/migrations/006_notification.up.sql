CREATE TABLE notifications (
  notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  activity_id BIGINT REFERENCES activity_logs(activity_id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX notifications_unread_idx
  ON notifications(recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;