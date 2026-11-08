-- 002_create_glucose_readings_table.sql
-- Creates the glucose_readings table with constraints and indexes for tracking blood glucose measurements

CREATE TABLE IF NOT EXISTS glucose_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reading_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key with cascade deletion when referenced user is removed
  CONSTRAINT fk_glucose_readings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Constraint: Glucose value must be between 40 and 600
  CONSTRAINT chk_glucose_readings_value CHECK (value >= 40 AND value <= 600),

  -- Constraint: Only the four specified time slots are allowed
  CONSTRAINT chk_glucose_readings_time_slot CHECK (time_slot IN ('morning', 'after_breakfast', 'after_lunch', 'after_dinner')),

  -- Constraint: A user can have only one reading per date per time slot
  CONSTRAINT uq_glucose_readings_user_date_slot UNIQUE (user_id, reading_date, time_slot)
);

-- Index for retrieving a user's readings by date
CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_id_reading_date ON glucose_readings (user_id, reading_date);
