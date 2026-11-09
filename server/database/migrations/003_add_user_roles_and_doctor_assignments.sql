-- 003_add_user_roles_and_doctor_assignments.sql
-- Adds role support to users and creates doctor_patient_assignments table

-- 1. Add role column to users (defaults existing and new users to 'patient')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'patient',
      ADD CONSTRAINT chk_users_role CHECK (role IN ('patient', 'doctor'));
  END IF;
END $$;

-- 2. Create doctor_patient_assignments table
CREATE TABLE IF NOT EXISTS doctor_patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys referencing users with cascade delete
  CONSTRAINT fk_dpa_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dpa_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Unique assignment pair: a patient cannot be assigned to the same doctor twice
  CONSTRAINT uq_doctor_patient UNIQUE (doctor_id, patient_id),

  -- User cannot be assigned to themselves
  CONSTRAINT chk_no_self_assignment CHECK (doctor_id <> patient_id)
);

-- Indexes for efficient lookup of doctor assignments and patient assignments
CREATE INDEX IF NOT EXISTS idx_dpa_doctor_id ON doctor_patient_assignments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_dpa_patient_id ON doctor_patient_assignments (patient_id);
