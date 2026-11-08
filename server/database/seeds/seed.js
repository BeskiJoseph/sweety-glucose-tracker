const { pool, query } = require('../../src/config/db');
const { hashPassword } = require('../../src/utils/password.util');
const { runMigrations } = require('../migrate');

const DEMO_PATIENT = {
  name: 'Sarah Jenkins (Patient)',
  email: 'patient@sweety.local',
  password: 'Patient123!'
};

const DEMO_DOCTOR = {
  name: 'Dr. Alex Mercer, MD',
  email: 'doctor@sweety.local',
  password: 'Doctor123!'
};

/**
 * Generate realistic sample readings covering the current month and previous month.
 *
 * @param {string} userId - Patient UUID
 * @returns {Array<object>} Readings array
 */
function generateSampleReadings(userId) {
  const readings = [];
  const slots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

  // Base values per time slot
  const baseValues = {
    morning: 92,
    after_breakfast: 135,
    after_lunch: 128,
    after_dinner: 142
  };

  const today = new Date();

  // Generate 45 days of readings backward from today
  for (let daysAgo = 45; daysAgo >= 0; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // On today, insert 2 readings so there is room to add more; on past days insert 3 or 4
    const slotsForDay = daysAgo === 0 ? slots.slice(0, 2) : slots;

    slotsForDay.forEach((slot, idx) => {
      // Natural variation +- 15 mg/dL
      const variance = ((daysAgo * 7 + idx * 11) % 31) - 15;
      const value = Math.max(70, Math.min(220, baseValues[slot] + variance));

      readings.push({
        userId,
        readingDate: dateStr,
        timeSlot: slot,
        value
      });
    });
  }

  return readings;
}

/**
 * Seed database with demo accounts, readings, and doctor assignments.
 * Entire execution is idempotent.
 */
async function seedDatabase() {
  console.log('[Seed] Running migrations first...');
  await runMigrations();

  console.log('[Seed] Seeding demo patient account...');
  const patientHash = await hashPassword(DEMO_PATIENT.password);

  // Check if role column exists in users table (Bonus 7 support)
  const columnCheck = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  `);
  const hasRoleColumn = columnCheck.rowCount > 0;

  // Check if patient already exists by case-insensitive email
  const existingPatient = await query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [DEMO_PATIENT.email]
  );

  let patientId;
  if (existingPatient.rowCount > 0) {
    patientId = existingPatient.rows[0].id;
    if (hasRoleColumn) {
      await query(
        'UPDATE users SET name = $1, password_hash = $2, role = $3 WHERE id = $4',
        [DEMO_PATIENT.name, patientHash, 'patient', patientId]
      );
    } else {
      await query(
        'UPDATE users SET name = $1, password_hash = $2 WHERE id = $3',
        [DEMO_PATIENT.name, patientHash, patientId]
      );
    }
  } else {
    const insertSql = hasRoleColumn
      ? `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'patient') RETURNING id`
      : `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`;
    const insertRes = await query(insertSql, [
      DEMO_PATIENT.name,
      DEMO_PATIENT.email,
      patientHash
    ]);
    patientId = insertRes.rows[0].id;
  }

  console.log(`[Seed] Demo patient ready (ID: ${patientId})`);

  // Seed sample glucose readings
  console.log('[Seed] Seeding sample glucose readings...');
  const sampleReadings = generateSampleReadings(patientId);
  let insertedCount = 0;

  for (const r of sampleReadings) {
    const res = await query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, reading_date, time_slot) DO UPDATE
       SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [r.userId, r.readingDate, r.timeSlot, r.value]
    );
    if (res.rowCount > 0) insertedCount++;
  }
  console.log(`[Seed] Seeded ${insertedCount} glucose readings for ${DEMO_PATIENT.email}`);

  // If doctor_patient_assignments table exists (Bonus 7), seed doctor and assignment
  const assignmentTableCheck = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name = 'doctor_patient_assignments'
  `);

  if (assignmentTableCheck.rowCount > 0 && hasRoleColumn) {
    console.log('[Seed] Seeding demo doctor and assignment...');
    const doctorHash = await hashPassword(DEMO_DOCTOR.password);

    const existingDoctor = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [DEMO_DOCTOR.email]
    );

    let doctorId;
    if (existingDoctor.rowCount > 0) {
      doctorId = existingDoctor.rows[0].id;
      await query(
        'UPDATE users SET name = $1, password_hash = $2, role = $3 WHERE id = $4',
        [DEMO_DOCTOR.name, doctorHash, 'doctor', doctorId]
      );
    } else {
      const insertDoctor = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'doctor')
         RETURNING id`,
        [DEMO_DOCTOR.name, DEMO_DOCTOR.email, doctorHash]
      );
      doctorId = insertDoctor.rows[0].id;
    }

    // Assign patient to doctor
    await query(
      `INSERT INTO doctor_patient_assignments (doctor_id, patient_id)
       VALUES ($1, $2)
       ON CONFLICT (doctor_id, patient_id) DO NOTHING`,
      [doctorId, patientId]
    );

    console.log(`[Seed] Demo doctor ready (ID: ${doctorId}) assigned to Patient (ID: ${patientId})`);
  }

  console.log('[Seed] Database seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Error seeding database:', err);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { seedDatabase, DEMO_PATIENT, DEMO_DOCTOR };
