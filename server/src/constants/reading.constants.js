/**
 * Reading Constants for Sweety Blood Glucose Tracker
 */

const TIME_SLOTS = Object.freeze([
  'morning',
  'after_breakfast',
  'after_lunch',
  'after_dinner'
]);

const TIME_SLOT_LABELS = Object.freeze({
  morning: 'Morning',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner'
});

const MIN_GLUCOSE = 40;
const MAX_GLUCOSE = 600;
const MAX_DAILY_READINGS = 4;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Returns dynamic friendly error message for duplicate readings on the same date and slot.
 * Examples:
 * - 'You already have an After lunch reading for this date.'
 * - 'You already have a Morning reading for this date.'
 *
 * @param {string} slot - Time slot key
 * @returns {string} Formatted error message
 */
function getDuplicateSlotErrorMessage(slot) {
  const label = TIME_SLOT_LABELS[slot] || slot;
  const isVowel = /^[aeiou]/i.test(label);
  const article = isVowel ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}

module.exports = {
  TIME_SLOTS,
  TIME_SLOT_LABELS,
  MIN_GLUCOSE,
  MAX_GLUCOSE,
  MAX_DAILY_READINGS,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getDuplicateSlotErrorMessage
};
