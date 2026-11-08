const { query } = require('../config/db');

/**
 * Insert a new blood glucose reading into PostgreSQL.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.readingDate - Calendar date in YYYY-MM-DD
 * @param {string} params.timeSlot - morning | after_breakfast | after_lunch | after_dinner
 * @param {number} params.value - Glucose reading in mg/dL (40-600)
 * @returns {Promise<object>} Created reading row
 */
async function createReading({ userId, readingDate, timeSlot, value }) {
  const sql = `
    INSERT INTO glucose_readings (user_id, reading_date, time_slot, value)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, reading_date::text AS reading_date, time_slot, value, created_at, updated_at
  `;
  const result = await query(sql, [userId, readingDate, timeSlot, value]);
  return result.rows[0];
}

/**
 * Find single reading by ID strictly scoped to user.
 *
 * @param {string} id - Reading UUID
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<object|null>} Reading row or null
 */
async function findReadingById(id, userId) {
  const sql = `
    SELECT id, user_id, reading_date::text AS reading_date, time_slot, value, created_at, updated_at
    FROM glucose_readings
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `;
  const result = await query(sql, [id, userId]);
  return result.rows[0] || null;
}

/**
 * Find readings for user with pagination.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.limit - Max records
 * @param {number} params.offset - Pagination offset
 * @returns {Promise<Array<object>>} List of readings
 */
async function findReadingsByUser({ userId, limit, offset }) {
  const sql = `
    SELECT id, user_id, reading_date::text AS reading_date, time_slot, value, created_at, updated_at
    FROM glucose_readings
    WHERE user_id = $1
    ORDER BY reading_date DESC, created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await query(sql, [userId, limit, offset]);
  return result.rows;
}

/**
 * Count total readings for a user.
 *
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<number>} Total reading count
 */
async function countReadingsByUser(userId) {
  const sql = `
    SELECT COUNT(*)::int AS total
    FROM glucose_readings
    WHERE user_id = $1
  `;
  const result = await query(sql, [userId]);
  return result.rows[0].total;
}

/**
 * Count readings recorded on a specific date for a user.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} readingDate - Date in YYYY-MM-DD
 * @returns {Promise<number>} Count of readings on that date
 */
async function countReadingsByDate(userId, readingDate) {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM glucose_readings
    WHERE user_id = $1 AND reading_date = $2
  `;
  const result = await query(sql, [userId, readingDate]);
  return result.rows[0].count;
}

/**
 * Find existing reading for user on specific date and time slot.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} readingDate - Date in YYYY-MM-DD
 * @param {string} timeSlot - Time slot key
 * @returns {Promise<object|null>} Existing reading row or null
 */
async function findReadingByDateAndSlot(userId, readingDate, timeSlot) {
  const sql = `
    SELECT id, user_id, reading_date::text AS reading_date, time_slot, value
    FROM glucose_readings
    WHERE user_id = $1 AND reading_date = $2 AND time_slot = $3
    LIMIT 1
  `;
  const result = await query(sql, [userId, readingDate, timeSlot]);
  return result.rows[0] || null;
}

/**
 * Update existing reading by ID strictly scoped to user.
 *
 * @param {object} params
 * @param {string} params.id - Reading UUID
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.readingDate] - Updated date
 * @param {string} [params.timeSlot] - Updated slot
 * @param {number} [params.value] - Updated value
 * @returns {Promise<object|null>} Updated reading or null if not found
 */
async function updateReading({ id, userId, readingDate, timeSlot, value }) {
  const sql = `
    UPDATE glucose_readings
    SET
      reading_date = COALESCE($3, reading_date),
      time_slot = COALESCE($4, time_slot),
      value = COALESCE($5, value),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, reading_date::text AS reading_date, time_slot, value, created_at, updated_at
  `;
  const result = await query(sql, [id, userId, readingDate, timeSlot, value]);
  return result.rows[0] || null;
}

/**
 * Delete reading by ID strictly scoped to user.
 *
 * @param {string} id - Reading UUID
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteReading(id, userId) {
  const sql = `
    DELETE FROM glucose_readings
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const result = await query(sql, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Aggregate summary statistics (count, highest, lowest, average) for date range.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<object>} { count, highest, lowest, average }
 */
async function getDateRangeStats(userId, startDate, endDate) {
  const sql = `
    SELECT
      COUNT(*)::int AS count,
      MAX(value)::int AS highest,
      MIN(value)::int AS lowest,
      ROUND(AVG(value)::numeric, 1) AS average
    FROM glucose_readings
    WHERE user_id = $1 AND reading_date >= $2 AND reading_date <= $3
  `;
  const result = await query(sql, [userId, startDate, endDate]);
  return result.rows[0];
}

/**
 * Get all individual readings for a user on a given date sorted by time slot.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} readingDate - Date in YYYY-MM-DD
 * @returns {Promise<Array<object>>} List of day readings
 */
async function getReadingsByDate(userId, readingDate) {
  const sql = `
    SELECT id, user_id, reading_date::text AS reading_date, time_slot, value, created_at, updated_at
    FROM glucose_readings
    WHERE user_id = $1 AND reading_date = $2
    ORDER BY
      CASE time_slot
        WHEN 'morning' THEN 1
        WHEN 'after_breakfast' THEN 2
        WHEN 'after_lunch' THEN 3
        WHEN 'after_dinner' THEN 4
        ELSE 5
      END ASC
  `;
  const result = await query(sql, [userId, readingDate]);
  return result.rows;
}

/**
 * Get all readings for a specific user and month for trend charting.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} yearMonth - Month in YYYY-MM
 * @returns {Promise<Array<object>>} Chronologically ordered readings
 */
async function getReadingsByMonth(userId, yearMonth) {
  const sql = `
    SELECT id, user_id, reading_date::text AS reading_date, time_slot, value, created_at, updated_at
    FROM glucose_readings
    WHERE user_id = $1
      AND TO_CHAR(reading_date, 'YYYY-MM') = $2
    ORDER BY
      reading_date ASC,
      CASE time_slot
        WHEN 'morning' THEN 1
        WHEN 'after_breakfast' THEN 2
        WHEN 'after_lunch' THEN 3
        WHEN 'after_dinner' THEN 4
        ELSE 5
      END ASC
  `;
  const result = await query(sql, [userId, yearMonth]);
  return result.rows;
}

module.exports = {
  createReading,
  findReadingById,
  findReadingsByUser,
  countReadingsByUser,
  countReadingsByDate,
  findReadingByDateAndSlot,
  updateReading,
  deleteReading,
  getDateRangeStats,
  getReadingsByDate,
  getReadingsByMonth
};
