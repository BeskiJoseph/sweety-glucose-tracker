const AppError = require('../errors/AppError');
const {
  TIME_SLOTS,
  MIN_GLUCOSE,
  MAX_GLUCOSE,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT
} = require('../constants/reading.constants');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

/**
 * Get current calendar date string in YYYY-MM-DD format.
 * Compares against both local time and UTC to account for user time zones.
 *
 * @returns {string} Latest current calendar date string
 */
function getCurrentDateString() {
  const now = new Date();
  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, '0');
  const localD = String(now.getDate()).padStart(2, '0');
  const localDateStr = `${localY}-${localM}-${localD}`;

  const utcY = now.getUTCFullYear();
  const utcM = String(now.getUTCMonth() + 1).padStart(2, '0');
  const utcD = String(now.getUTCDate()).padStart(2, '0');
  const utcDateStr = `${utcY}-${utcM}-${utcD}`;

  return localDateStr > utcDateStr ? localDateStr : utcDateStr;
}

/**
 * Validate and normalize glucose value.
 *
 * @param {*} rawValue - Value from request
 * @returns {number} Validated integer glucose value
 */
function validateGlucoseValue(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    throw new AppError('Please enter a glucose value.', 400);
  }

  // Check if string representation contains only digits (optional leading whitespace)
  if (typeof rawValue === 'string' && !/^\s*-?\d+\s*$/.test(rawValue)) {
    throw new AppError('Value must be between 40 and 600 mg/dl.', 400);
  }

  const num = Number(rawValue);

  if (!Number.isInteger(num) || num < MIN_GLUCOSE || num > MAX_GLUCOSE) {
    throw new AppError('Value must be between 40 and 600 mg/dl.', 400);
  }

  return num;
}

/**
 * Validate reading date string (YYYY-MM-DD).
 *
 * @param {string} rawDate - Date from request
 * @returns {string} Validated date string
 */
function validateReadingDate(rawDate) {
  if (!rawDate || typeof rawDate !== 'string' || !DATE_REGEX.test(rawDate.trim())) {
    throw new AppError('Please provide a valid reading date (YYYY-MM-DD).', 400);
  }

  const dateStr = rawDate.trim();
  const [year, month, day] = dateStr.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  // Verify valid calendar day (e.g. reject 2026-02-30)
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new AppError('Please provide a valid calendar date.', 400);
  }

  const maxAllowedDate = getCurrentDateString();
  if (dateStr > maxAllowedDate) {
    throw new AppError('Date cannot be in the future.', 400);
  }

  return dateStr;
}

/**
 * Validate time slot.
 *
 * @param {string} rawSlot - Time slot key
 * @returns {string} Validated time slot
 */
function validateTimeSlot(rawSlot) {
  if (!rawSlot || typeof rawSlot !== 'string') {
    throw new AppError('Please select a valid time slot.', 400);
  }

  const slot = rawSlot.trim();
  if (!TIME_SLOTS.includes(slot)) {
    throw new AppError(
      'Invalid time slot. Allowed values: morning, after_breakfast, after_lunch, after_dinner.',
      400
    );
  }

  return slot;
}

/**
 * Validate payload for creating a glucose reading.
 *
 * @param {object} body - Request body
 * @returns {object} Validated { readingDate, timeSlot, value }
 */
function validateCreateReading(body = {}) {
  const value = validateGlucoseValue(body.value);
  const readingDate = validateReadingDate(body.reading_date || body.readingDate);
  const timeSlot = validateTimeSlot(body.time_slot || body.timeSlot);

  return {
    readingDate,
    timeSlot,
    value
  };
}

/**
 * Validate payload for updating an existing glucose reading.
 *
 * @param {object} body - Request body
 * @returns {object} Validated { readingDate, timeSlot, value }
 */
function validateUpdateReading(body = {}) {
  // Update can include any combination of fields, but if provided they must be valid
  const validated = {};

  if (body.value !== undefined) {
    validated.value = validateGlucoseValue(body.value);
  }

  if (body.reading_date !== undefined || body.readingDate !== undefined) {
    validated.readingDate = validateReadingDate(body.reading_date || body.readingDate);
  }

  if (body.time_slot !== undefined || body.timeSlot !== undefined) {
    validated.timeSlot = validateTimeSlot(body.time_slot || body.timeSlot);
  }

  if (Object.keys(validated).length === 0) {
    throw new AppError('Please provide at least one field to update.', 400);
  }

  return validated;
}

/**
 * Validate pagination query parameters.
 *
 * @param {object} query - Request query params
 * @returns {object} Validated { page, limit, offset }
 */
function validatePaginationQuery(query = {}) {
  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  if (query.page !== undefined && query.page !== '') {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new AppError('Page must be a positive integer.', 400);
    }
    page = parsedPage;
  }

  if (query.limit !== undefined && query.limit !== '') {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      throw new AppError(`Limit must be an integer between 1 and ${MAX_LIMIT}.`, 400);
    }
    limit = parsedLimit;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Validate report date query parameter.
 *
 * @param {string} rawDate - Query date
 * @returns {string} Validated date string (YYYY-MM-DD)
 */
function validateReportDateQuery(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') {
    // Default to current date if not specified
    return getCurrentDateString();
  }

  const trimmed = rawDate.trim();
  if (!DATE_REGEX.test(trimmed)) {
    throw new AppError('Report date must be in YYYY-MM-DD format.', 400);
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new AppError('Please provide a valid calendar date.', 400);
  }

  return trimmed;
}

/**
 * Validate trend month query parameter.
 *
 * @param {string} rawMonth - Query month (YYYY-MM)
 * @returns {string} Validated month string (YYYY-MM)
 */
function validateTrendMonthQuery(rawMonth) {
  if (!rawMonth || typeof rawMonth !== 'string') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  const trimmed = rawMonth.trim();
  if (!MONTH_REGEX.test(trimmed)) {
    throw new AppError('Trend month must be in YYYY-MM format.', 400);
  }

  const [year, month] = trimmed.split('-').map(Number);
  if (month < 1 || month > 12) {
    throw new AppError('Month must be between 01 and 12.', 400);
  }

  return trimmed;
}

module.exports = {
  validateCreateReading,
  validateUpdateReading,
  validatePaginationQuery,
  validateReportDateQuery,
  validateTrendMonthQuery,
  getCurrentDateString
};
