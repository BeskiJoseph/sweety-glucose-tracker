const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { pool, closePool } = require('../../src/config/db');
const { runMigrations } = require('../../database/migrate');

describe('Database Schema & Migration: glucose_readings', () => {
  let testUserId1;
  let testUserId2;

  before(async () => {
    // Run migrations to ensure database is at latest version
    await runMigrations();

    // Create test users for constraint testing
    const res1 = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Reading Test User 1', `test_glucose_user1_${Date.now()}@example.com`, 'hashed_pw_123']
    );
    testUserId1 = res1.rows[0].id;

    const res2 = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Reading Test User 2', `test_glucose_user2_${Date.now()}@example.com`, 'hashed_pw_123']
    );
    testUserId2 = res2.rows[0].id;
  });

  after(async () => {
    // Clean up test users (cascade will remove readings)
    if (pool) {
      if (testUserId1 || testUserId2) {
        await pool.query(
          'DELETE FROM users WHERE id IN ($1, $2)',
          [testUserId1, testUserId2]
        );
      }
      await closePool();
    }
  });

  it('should have applied 002_create_glucose_readings_table.sql in _migrations', async () => {
    const res = await pool.query(
      'SELECT filename FROM _migrations WHERE filename = $1',
      ['002_create_glucose_readings_table.sql']
    );
    assert.equal(res.rowCount, 1);
  });

  it('should define glucose_readings table with the expected column specifications', async () => {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'glucose_readings'
      ORDER BY ordinal_position;
    `);

    const columns = Object.fromEntries(
      res.rows.map((row) => [row.column_name, row])
    );

    // Required columns
    assert.ok(columns.id, 'id column exists');
    assert.equal(columns.id.data_type, 'uuid');
    assert.equal(columns.id.is_nullable, 'NO');

    assert.ok(columns.user_id, 'user_id column exists');
    assert.equal(columns.user_id.data_type, 'uuid');
    assert.equal(columns.user_id.is_nullable, 'NO');

    assert.ok(columns.reading_date, 'reading_date column exists');
    assert.equal(columns.reading_date.data_type, 'date');
    assert.equal(columns.reading_date.is_nullable, 'NO');

    assert.ok(columns.time_slot, 'time_slot column exists');
    assert.equal(columns.time_slot.data_type, 'character varying');
    assert.equal(columns.time_slot.is_nullable, 'NO');

    assert.ok(columns.value, 'value column exists');
    assert.equal(columns.value.data_type, 'integer');
    assert.equal(columns.value.is_nullable, 'NO');

    assert.ok(columns.created_at, 'created_at column exists');
    assert.ok(
      columns.created_at.data_type.startsWith('timestamp'),
      `created_at should be timestamp, got ${columns.created_at.data_type}`
    );
    assert.equal(columns.created_at.is_nullable, 'NO');

    assert.ok(columns.updated_at, 'updated_at column exists');
    assert.ok(
      columns.updated_at.data_type.startsWith('timestamp'),
      `updated_at should be timestamp, got ${columns.updated_at.data_type}`
    );
    assert.equal(columns.updated_at.is_nullable, 'NO');
  });

  it('should successfully insert valid glucose readings across all four time slots', async () => {
    const validSlots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
    const testDate = '2026-03-01';

    for (let i = 0; i < validSlots.length; i++) {
      const slot = validSlots[i];
      const val = 80 + i * 20; // 80, 100, 120, 140

      const insertRes = await pool.query(
        `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, reading_date, time_slot, value, created_at, updated_at`,
        [testUserId1, testDate, slot, val]
      );

      assert.equal(insertRes.rowCount, 1);
      const row = insertRes.rows[0];
      assert.ok(row.id, 'UUID generated automatically');
      assert.equal(row.user_id, testUserId1);
      assert.equal(row.time_slot, slot);
      assert.equal(row.value, val);
      assert.ok(row.created_at instanceof Date);
      assert.ok(row.updated_at instanceof Date);
    }
  });

  it('should enforce boundary values [40, 600] for blood glucose reading value', async () => {
    // 40 is valid (lower bound)
    const resLow = await pool.query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES ($1, '2026-03-02', 'morning', 40)
       RETURNING value`,
      [testUserId1]
    );
    assert.equal(resLow.rows[0].value, 40);

    // 600 is valid (upper bound)
    const resHigh = await pool.query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES ($1, '2026-03-02', 'after_dinner', 600)
       RETURNING value`,
      [testUserId1]
    );
    assert.equal(resHigh.rows[0].value, 600);

    // Below 40 (e.g., 39) must fail check constraint
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
           VALUES ($1, '2026-03-02', 'after_breakfast', 39)`,
          [testUserId1]
        );
      },
      (err) => {
        assert.equal(err.code, '23514'); // check_violation
        assert.ok(err.message.includes('chk_glucose_readings_value'));
        return true;
      }
    );

    // Above 600 (e.g., 601) must fail check constraint
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
           VALUES ($1, '2026-03-02', 'after_lunch', 601)`,
          [testUserId1]
        );
      },
      (err) => {
        assert.equal(err.code, '23514'); // check_violation
        assert.ok(err.message.includes('chk_glucose_readings_value'));
        return true;
      }
    );
  });

  it('should reject invalid time slots not in the four allowed values', async () => {
    const invalidSlots = ['bedtime', 'before_breakfast', 'lunch', 'random_slot', ''];

    for (const slot of invalidSlots) {
      await assert.rejects(
        async () => {
          await pool.query(
            `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
             VALUES ($1, '2026-03-03', $2, 100)`,
            [testUserId1, slot]
          );
        },
        (err) => {
          assert.equal(err.code, '23514'); // check_violation
          assert.ok(err.message.includes('chk_glucose_readings_time_slot'));
          return true;
        }
      );
    }
  });

  it('should enforce unique constraint (one reading per date per time slot per user)', async () => {
    // First reading succeeds
    await pool.query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES ($1, '2026-03-04', 'morning', 110)`,
      [testUserId1]
    );

    // Duplicate entry for same user, same date, same time slot must fail
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
           VALUES ($1, '2026-03-04', 'morning', 130)`,
          [testUserId1]
        );
      },
      (err) => {
        assert.equal(err.code, '23505'); // unique_violation
        assert.ok(err.message.includes('uq_glucose_readings_user_date_slot'));
        return true;
      }
    );

    // Another user CAN have a reading for the same date and time slot
    const diffUserRes = await pool.query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES ($1, '2026-03-04', 'morning', 115)
       RETURNING id`,
      [testUserId2]
    );
    assert.equal(diffUserRes.rowCount, 1);
  });

  it('should cascade-delete all readings when a user is deleted', async () => {
    // Create a temporary user with readings
    const tempUser = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Cascade User', 'temp_cascade_${Date.now()}@example.com', 'temp_pw')
       RETURNING id`
    );
    const tempUserId = tempUser.rows[0].id;

    // Insert 2 readings for temp user
    await pool.query(
      `INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
       VALUES
         ($1, '2026-03-05', 'morning', 95),
         ($1, '2026-03-05', 'after_lunch', 135)`,
      [tempUserId]
    );

    const checkBefore = await pool.query(
      'SELECT COUNT(*)::int AS count FROM glucose_readings WHERE user_id = $1',
      [tempUserId]
    );
    assert.equal(checkBefore.rows[0].count, 2);

    // Delete the temporary user
    await pool.query('DELETE FROM users WHERE id = $1', [tempUserId]);

    // Verify readings were cascade-deleted
    const checkAfter = await pool.query(
      'SELECT COUNT(*)::int AS count FROM glucose_readings WHERE user_id = $1',
      [tempUserId]
    );
    assert.equal(checkAfter.rows[0].count, 0);
  });

  it('should have index on (user_id, reading_date)', async () => {
    const res = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'glucose_readings'
        AND indexdef LIKE '%user_id%'
        AND indexdef LIKE '%reading_date%';
    `);

    assert.ok(res.rowCount >= 1, 'Index on user_id and reading_date exists');
    const customIndex = res.rows.find(
      (r) => r.indexname === 'idx_glucose_readings_user_id_reading_date'
    );
    assert.ok(customIndex, 'idx_glucose_readings_user_id_reading_date index found');
  });
});
