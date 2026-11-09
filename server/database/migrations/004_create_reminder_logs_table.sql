-- 004_create_reminder_logs_table.sql
-- Creates reminder_logs table to track background reminder jobs and prevent duplicate processing

CREATE TABLE IF NOT EXISTS reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_date DATE NOT NULL,
  readings_count INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key with cascade deletion when referenced user is removed
  CONSTRAINT fk_reminder_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Unique constraint ensuring exactly one reminder log per user per calendar day
  CONSTRAINT uq_reminder_logs_user_date UNIQUE (user_id, reminder_date)
);

-- Index for querying reminders by date
CREATE INDEX IF NOT EXISTS idx_reminder_logs_date ON reminder_logs (reminder_date);
