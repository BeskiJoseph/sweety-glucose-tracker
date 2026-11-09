/**
 * Sweety Glucose Tracker — Date Utilities
 */

/**
 * Compute previous calendar month date boundaries.
 *
 * @param {number} year - Selected year
 * @param {number} month - Selected month (1-12)
 * @returns {object} { month: 'YYYY-MM', startDate: 'YYYY-MM-01', endDate: 'YYYY-MM-DD' }
 */
function getPreviousMonthRange(year, month) {
  let prevYear = Number(year);
  let prevMonth = Number(month) - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = Number(year) - 1;
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

module.exports = {
  getPreviousMonthRange
};
