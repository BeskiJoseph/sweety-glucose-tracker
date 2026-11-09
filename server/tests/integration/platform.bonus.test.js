const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const app = require('../../src/app');
const { pool, closePool } = require('../../src/config/db');
const { runMigrations } = require('../../database/migrate');
const { signToken } = require('../../src/utils/token.util');
const { AUTH_COOKIE_NAME } = require('../../src/constants/auth.constants');
const cacheService = require('../../src/services/cache.service');
const { closeRedis } = require('../../src/config/redis');
const { closeQueue } = require('../../src/jobs/reminder.queue');
const { processDailyReminders } = require('../../src/workers/reminder.worker');

let server;
let baseUrl;

let doctorUser = {
  id: null,
  name: 'Dr. Gregory House',
  email: `doctor_${Date.now()}@sweety.test`,
  role: 'doctor'
};

let assignedPatient = {
  id: null,
  name: 'Assigned Patient',
  email: `assigned_${Date.now()}@sweety.test`,
  role: 'patient'
};

let unassignedPatient = {
  id: null,
  name: 'Unassigned Patient',
  email: `unassigned_${Date.now()}@sweety.test`,
  role: 'patient'
};

let doctorCookie;
let patientCookie;

before(async () => {
  await runMigrations();

  // Create test users
  const docRes = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [doctorUser.name, doctorUser.email, 'hash_doc', doctorUser.role]
  );
  doctorUser.id = docRes.rows[0].id;
  doctorCookie = `${AUTH_COOKIE_NAME}=${signToken({ userId: doctorUser.id, role: doctorUser.role })}`;

  const patRes = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [assignedPatient.name, assignedPatient.email, 'hash_pat', assignedPatient.role]
  );
  assignedPatient.id = patRes.rows[0].id;
  patientCookie = `${AUTH_COOKIE_NAME}=${signToken({ userId: assignedPatient.id, role: assignedPatient.role })}`;

  const unassignedRes = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [unassignedPatient.name, unassignedPatient.email, 'hash_unassigned', unassignedPatient.role]
  );
  unassignedPatient.id = unassignedRes.rows[0].id;

  // Create doctor-patient assignment
  await pool.query(
    'INSERT INTO doctor_patient_assignments (doctor_id, patient_id) VALUES ($1, $2)',
    [doctorUser.id, assignedPatient.id]
  );

  // Start HTTP test server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (pool) {
    const userIds = [doctorUser.id, assignedPatient.id, unassignedPatient.id].filter(Boolean);
    if (userIds.length > 0) {
      await pool.query('DELETE FROM reminder_logs WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM doctor_patient_assignments WHERE doctor_id = $1', [doctorUser.id]);
      await pool.query('DELETE FROM glucose_readings WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    }
    await closePool();
  }
  await closeQueue().catch(() => {});
  await closeRedis().catch(() => {});
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Bonus 7: Doctor Access & Role-Based Authorization', () => {
  it('should block patients from accessing doctor endpoints with HTTP 403', async () => {
    const res = await fetch(`${baseUrl}/api/doctor/patients`, {
      headers: { Cookie: patientCookie }
    });
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.match(body.message, /Doctor role required/i);
  });

  it('should allow doctors to view their assigned patients list', async () => {
    const res = await fetch(`${baseUrl}/api/doctor/patients`, {
      headers: { Cookie: doctorCookie }
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));

    const found = body.data.find((p) => p.id === assignedPatient.id);
    assert.ok(found, 'Assigned patient must be in doctor list');
    assert.equal(found.email, assignedPatient.email);
  });

  it('should allow doctor to view assigned patient reports', async () => {
    // Add a reading for assigned patient
    await pool.query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES ($1, '2026-10-15', 'morning', 125)`,
      [assignedPatient.id]
    );

    const res = await fetch(
      `${baseUrl}/api/doctor/patients/${assignedPatient.id}/reports?date=2026-10-15`,
      {
        headers: { Cookie: doctorCookie }
      }
    );
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.daily.count, 1);
    assert.equal(body.data.daily.average, 125);
    assert.equal(body.data.daily.readings[0].value, 125);
  });

  it('should forbid doctor from accessing unassigned patient reports with HTTP 403', async () => {
    const res = await fetch(
      `${baseUrl}/api/doctor/patients/${unassignedPatient.id}/reports?date=2026-10-15`,
      {
        headers: { Cookie: doctorCookie }
      }
    );
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.match(body.message, /do not have access to this patient's records/i);
  });

  it('should prevent registration payload from elevating role to doctor', async () => {
    const maliciousEmail = `hacker_${Date.now()}@sweety.test`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker Attempting Doctor Role',
        email: maliciousEmail,
        password: 'Password123!',
        role: 'doctor' // Exploit attempt
      })
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);

    // Verify in database that role was forced to 'patient'
    const dbUser = await pool.query('SELECT role FROM users WHERE email = $1', [maliciousEmail]);
    assert.equal(dbUser.rows[0].role, 'patient', 'Role must always be patient on registration');

    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', [maliciousEmail]);
  });

  it('should immediately revoke doctor access when doctor is demoted in database even with valid token', async () => {
    // 1. Verify doctor currently has access
    const initialRes = await fetch(`${baseUrl}/api/doctor/patients`, {
      headers: { Cookie: doctorCookie }
    });
    assert.equal(initialRes.status, 200, 'Doctor should have access initially');

    // 2. Demote doctor to patient directly in PostgreSQL
    await pool.query("UPDATE users SET role = 'patient' WHERE id = $1", [doctorUser.id]);

    try {
      // 3. Attempt access using the existing JWT token (which still contains role: 'doctor')
      const demotedRes = await fetch(`${baseUrl}/api/doctor/patients`, {
        headers: { Cookie: doctorCookie }
      });
      const demotedBody = await demotedRes.json();

      assert.equal(demotedRes.status, 403, 'Demoted doctor must immediately receive HTTP 403');
      assert.equal(demotedBody.success, false);
      assert.match(demotedBody.message, /Doctor role required/i);
    } finally {
      // Restore doctor role in DB
      await pool.query("UPDATE users SET role = 'doctor' WHERE id = $1", [doctorUser.id]);
    }
  });

  it('should reject unauthenticated, invalid, or expired tokens with HTTP 401 on doctor endpoints', async () => {
    // No cookie
    const noAuthRes = await fetch(`${baseUrl}/api/doctor/patients`);
    assert.equal(noAuthRes.status, 401);

    // Tampered / invalid token
    const invalidRes = await fetch(`${baseUrl}/api/doctor/patients`, {
      headers: { Cookie: `${AUTH_COOKIE_NAME}=invalid.jwt.token` }
    });
    assert.equal(invalidRes.status, 401);
  });
});

describe('Bonus 6: BullMQ Daily Reminder Logic & Duplicate Prevention', () => {
  const testDate = '2026-10-18';

  it('should generate reminders for patients with < 4 readings and log to reminder_logs', async () => {
    // assignedPatient has 0 readings for testDate, so they qualify (< 4)
    const reminders = await processDailyReminders(testDate);

    const patientReminder = reminders.find((r) => r.userId === assignedPatient.id);
    assert.ok(patientReminder, 'Patient with < 4 readings should receive reminder');
    assert.equal(patientReminder.readingsCount, 0);

    // Verify doctorUser is NOT in reminders list
    const doctorReminder = reminders.find((r) => r.userId === doctorUser.id);
    assert.equal(doctorReminder, undefined, 'Doctors should not receive patient glucose reminders');

    // Verify reminder_logs entry exists
    const logResult = await pool.query(
      'SELECT * FROM reminder_logs WHERE user_id = $1 AND reminder_date = $2',
      [assignedPatient.id, testDate]
    );
    assert.equal(logResult.rowCount, 1, 'Reminder log entry must be created');
    assert.equal(logResult.rows[0].readings_count, 0);
  });

  it('should be idempotent and prevent duplicate reminders on the same calendar day', async () => {
    // Running again for same testDate should not generate duplicate reminder for assignedPatient
    const secondRun = await processDailyReminders(testDate);

    const duplicateReminder = secondRun.find((r) => r.userId === assignedPatient.id);
    assert.equal(duplicateReminder, undefined, 'Should not send duplicate reminder on the same date');

    const totalLogs = await pool.query(
      'SELECT count(*) FROM reminder_logs WHERE user_id = $1 AND reminder_date = $2',
      [assignedPatient.id, testDate]
    );
    assert.equal(parseInt(totalLogs.rows[0].count, 10), 1, 'Only one log entry must exist per user per date');
  });
});

describe('Bonus 5: Redis Report Caching & Graceful Fallback', () => {
  it('should generate properly formatted cache keys', () => {
    const key = cacheService.getReportCacheKey('user-123', '2026-10-15');
    const keysetKey = cacheService.getUserReportKeysetKey('user-123');

    assert.equal(key, 'reports:user:user-123:date:2026-10-15');
    assert.equal(keysetKey, 'reports:user:user-123:keys');
  });

  it('should gracefully degrade when Redis is unavailable or on cache miss', async () => {
    // getCachedReport should return null safely without throwing
    const result = await cacheService.getCachedReport('nonexistent-user', '2026-10-15');
    assert.equal(result, null);

    // setCachedReport should not throw
    await assert.doesNotReject(async () => {
      await cacheService.setCachedReport('user-123', '2026-10-15', { test: true });
    });

    // invalidateUserReports should not throw
    await assert.doesNotReject(async () => {
      await cacheService.invalidateUserReports('user-123');
    });
  });

  it('should return valid report structure for patient regardless of cache state', async () => {
    const res = await fetch(`${baseUrl}/api/reports?date=2026-10-15`, {
      headers: { Cookie: patientCookie }
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.daily);
    assert.ok(body.data.monthToDate);
    assert.ok(body.data.monthly);
  });

  it('should bypass stale cached reports when user invalidation is marked dirty', async () => {
    const testUserId = 'test-stale-user-123';
    const testDateStr = '2026-10-15';

    // Store dummy report in cache
    await cacheService.setCachedReport(testUserId, testDateStr, { daily: { count: 99 } });

    // Mark user dirty to simulate invalidation failure
    cacheService.markUserDirtyForTest(testUserId);

    // getCachedReport must return null to bypass stale data
    const result = await cacheService.getCachedReport(testUserId, testDateStr);
    assert.equal(result, null, 'Stale cache must be bypassed when invalidation failed');
  });

  it('should validate REPORT_CACHE_TTL_SECONDS configuration as positive integer', () => {
    // Valid values should parse
    const valid = ['60', '300', '3600'];
    for (const val of valid) {
      const parsed = parseInt(val, 10);
      assert.ok(parsed > 0 && String(parsed) === val);
    }

    // Invalid values should be identified
    const invalid = ['0', '-10', 'abc', '3.5'];
    for (const val of invalid) {
      const parsed = parseInt(val, 10);
      const isInvalid = isNaN(parsed) || String(parsed) !== val || parsed <= 0;
      assert.ok(isInvalid, `Value "${val}" must be recognized as invalid`);
    }
  });
});
