const readingRepository = require('../repositories/reading.repository');
const AppError = require('../errors/AppError');
const {
  MAX_DAILY_READINGS,
  getDuplicateSlotErrorMessage
} = require('../constants/reading.constants');

/**
 * Format summary statistics object with null defaults for empty data.
 *
 * @param {object} stats - { count, highest, lowest, average } from repository
 * @returns {object} Normalized stats
 */
function formatStats(stats = {}) {
  const count = Number(stats.count) || 0;
  return {
    count,
    highest: count > 0 && stats.highest !== null ? Number(stats.highest) : null,
    lowest: count > 0 && stats.lowest !== null ? Number(stats.lowest) : null,
    average: count > 0 && stats.average !== null ? Number(Number(stats.average).toFixed(1)) : null
  };
}

/**
 * Compute previous calendar month date boundaries.
 *
 * @param {number} year - Selected year
 * @param {number} month - Selected month (1-12)
 * @returns {object} { month: 'YYYY-MM', startDate: 'YYYY-MM-01', endDate: 'YYYY-MM-DD' }
 */
function getPreviousMonthRange(year, month) {
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  const prevMonthStr = String(prevMonth).padStart(2, '0');
  const startDate = `${prevYear}-${prevMonthStr}-01`;
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const endDate = `${prevYear}-${prevMonthStr}-${String(lastDay).padStart(2, '0')}`;

  return {
    month: `${prevYear}-${prevMonthStr}`,
    startDate,
    endDate
  };
}

/**
 * Create a new blood glucose reading with strict business rules:
 * - Max 4 readings per user per calendar day
 * - Exactly one reading per time slot per user per calendar day
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.readingDate - Calendar date in YYYY-MM-DD
 * @param {string} params.timeSlot - morning | after_breakfast | after_lunch | after_dinner
 * @param {number} params.value - Glucose reading in mg/dL (40-600)
 * @returns {Promise<object>} Created reading row
 */
async function createReading({ userId, readingDate, timeSlot, value }) {
  // Check if slot is already logged for this user on this date
  const existingSlot = await readingRepository.findReadingByDateAndSlot(
    userId,
    readingDate,
    timeSlot
  );
  if (existingSlot) {
    throw new AppError(getDuplicateSlotErrorMessage(timeSlot), 409);
  }

  // Check if user already reached the maximum 4 readings for this date
  const dayCount = await readingRepository.countReadingsByDate(userId, readingDate);
  if (dayCount >= MAX_DAILY_READINGS) {
    throw new AppError('You can add only 4 readings per day.', 400);
  }

  try {
    return await readingRepository.createReading({
      userId,
      readingDate,
      timeSlot,
      value
    });
  } catch (err) {
    // Graceful handling if concurrent request hit unique constraint
    if (err.code === '23505') {
      throw new AppError(getDuplicateSlotErrorMessage(timeSlot), 409);
    }
    if (err.code === '23514') {
      throw new AppError('Value must be between 40 and 600 mg/dl.', 400);
    }
    throw err;
  }
}

/**
 * Retrieve paginated glucose readings for authenticated user.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.page - 1-based page number
 * @param {number} params.limit - Items per page
 * @param {number} params.offset - SQL offset
 * @returns {Promise<object>} { data, pagination: { page, limit, total, totalPages } }
 */
async function getReadings({ userId, page, limit, offset }) {
  const [data, total] = await Promise.all([
    readingRepository.findReadingsByUser({ userId, limit, offset }),
    readingRepository.countReadingsByUser(userId)
  ]);

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}

/**
 * Find single reading by ID with user ownership check.
 *
 * @param {string} id - Reading UUID
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<object>} Reading record
 */
async function getReadingById(id, userId) {
  const reading = await readingRepository.findReadingById(id, userId);
  if (!reading) {
    throw new AppError('Reading not found', 404);
  }
  return reading;
}

/**
 * Update existing glucose reading with ownership check and conflict validation.
 *
 * @param {object} params
 * @param {string} params.id - Reading UUID
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.readingDate] - Updated date
 * @param {string} [params.timeSlot] - Updated slot
 * @param {number} [params.value] - Updated value
 * @returns {Promise<object>} Updated reading record
 */
async function updateReading({ id, userId, readingDate, timeSlot, value }) {
  const existing = await readingRepository.findReadingById(id, userId);
  if (!existing) {
    throw new AppError('Reading not found', 404);
  }

  const targetDate = readingDate || existing.reading_date;
  const targetSlot = timeSlot || existing.time_slot;

  // If date or slot is modified, verify conflict and daily limit
  if (targetDate !== existing.reading_date || targetSlot !== existing.time_slot) {
    const duplicate = await readingRepository.findReadingByDateAndSlot(
      userId,
      targetDate,
      targetSlot
    );
    if (duplicate && duplicate.id !== id) {
      throw new AppError(getDuplicateSlotErrorMessage(targetSlot), 409);
    }

    if (targetDate !== existing.reading_date) {
      const count = await readingRepository.countReadingsByDate(userId, targetDate);
      if (count >= MAX_DAILY_READINGS) {
        throw new AppError('You can add only 4 readings per day.', 400);
      }
    }
  }

  try {
    const updated = await readingRepository.updateReading({
      id,
      userId,
      readingDate,
      timeSlot,
      value
    });
    return updated;
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(getDuplicateSlotErrorMessage(targetSlot), 409);
    }
    if (err.code === '23514') {
      throw new AppError('Value must be between 40 and 600 mg/dl.', 400);
    }
    throw err;
  }
}

/**
 * Delete reading with user ownership verification.
 *
 * @param {string} id - Reading UUID
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<void>}
 */
async function deleteReading(id, userId) {
  const deleted = await readingRepository.deleteReading(id, userId);
  if (!deleted) {
    throw new AppError('Reading not found', 404);
  }
}

/**
 * Compute daily, month-to-date, and previous-month report metrics.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.date - Selected report date (YYYY-MM-DD)
 * @returns {Promise<object>} { daily, monthToDate, monthly }
 */
async function getReports({ userId, date }) {
  const [yearStr, monthStr] = date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const mtdStartDate = `${yearStr}-${monthStr}-01`;
  const prevMonthRange = getPreviousMonthRange(year, month);

  const [dailyStatsRaw, dayReadings, mtdStatsRaw, monthlyStatsRaw] = await Promise.all([
    readingRepository.getDateRangeStats(userId, date, date),
    readingRepository.getReadingsByDate(userId, date),
    readingRepository.getDateRangeStats(userId, mtdStartDate, date),
    readingRepository.getDateRangeStats(userId, prevMonthRange.startDate, prevMonthRange.endDate)
  ]);

  const dailyStats = formatStats(dailyStatsRaw);
  const monthToDateStats = formatStats(mtdStatsRaw);
  const monthlyStats = formatStats(monthlyStatsRaw);

  return {
    daily: {
      date,
      ...dailyStats,
      readings: dayReadings
    },
    monthToDate: {
      startDate: mtdStartDate,
      endDate: date,
      ...monthToDateStats
    },
    monthly: {
      month: prevMonthRange.month,
      startDate: prevMonthRange.startDate,
      endDate: prevMonthRange.endDate,
      ...monthlyStats
    }
  };
}

/**
 * Retrieve month readings for trend charting.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.month - Year and month in YYYY-MM
 * @returns {Promise<object>} { month, readings }
 */
async function getTrendReport({ userId, month }) {
  const readings = await readingRepository.getReadingsByMonth(userId, month);
  return {
    month,
    readings
  };
}

module.exports = {
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
  getReports,
  getTrendReport,
  getPreviousMonthRange
};
