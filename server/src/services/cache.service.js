const { redisClient, isReady } = require('../config/redis');
const { REPORT_CACHE_TTL_SECONDS } = require('../config/env');

// Track users whose cache invalidation failed, to prevent serving stale cached reports
const dirtyUsers = new Set();

/**
 * Generate standardized report cache key.
 *
 * @param {string} userId - User UUID
 * @param {string} date - Report date (YYYY-MM-DD)
 * @returns {string} Cache key
 */
function getReportCacheKey(userId, date) {
  return `reports:user:${userId}:date:${date}`;
}

/**
 * Generate Redis key for the set containing all active report cache keys for a user.
 *
 * @param {string} userId - User UUID
 * @returns {string} Set key
 */
function getUserReportKeysetKey(userId) {
  return `reports:user:${userId}:keys`;
}

/**
 * Retrieve cached report data from Redis.
 * Returns null on cache miss, when Redis is unavailable, or if a previous invalidation failed.
 *
 * @param {string} userId - User UUID
 * @param {string} date - Report date (YYYY-MM-DD)
 * @returns {Promise<object|null>}
 */
async function getCachedReport(userId, date) {
  // If a previous invalidation failed for this user, do not serve stale cached data
  if (dirtyUsers.has(userId)) {
    // Attempt retry in background
    invalidateUserReports(userId).catch(() => {});
    return null;
  }

  if (!isReady()) return null;

  try {
    const key = getReportCacheKey(userId, date);
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.warn('[Cache Notice] Failed to read report from Redis:', err.message);
    return null;
  }
}

/**
 * Store report data in Redis with TTL and track key in user's key-set for targeted invalidation.
 *
 * @param {string} userId - User UUID
 * @param {string} date - Report date (YYYY-MM-DD)
 * @param {object} reportData - Report payload to cache
 * @returns {Promise<void>}
 */
async function setCachedReport(userId, date, reportData) {
  if (!isReady()) return;

  try {
    const key = getReportCacheKey(userId, date);
    const keysetKey = getUserReportKeysetKey(userId);

    const pipeline = redisClient.pipeline();
    pipeline.set(key, JSON.stringify(reportData), 'EX', REPORT_CACHE_TTL_SECONDS);
    pipeline.sadd(keysetKey, key);
    pipeline.expire(keysetKey, REPORT_CACHE_TTL_SECONDS * 2);

    await pipeline.exec();
    dirtyUsers.delete(userId);
  } catch (err) {
    console.warn('[Cache Notice] Failed to write report to Redis:', err.message);
  }
}

/**
 * Invalidate all cached report ranges for a user.
 * Triggered whenever a reading is created, updated, or deleted.
 * Avoids expensive KEYS * scans by referencing the user's tracked key set.
 * If Redis operation fails, marks user as dirty to prevent serving stale reports.
 *
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
async function invalidateUserReports(userId) {
  dirtyUsers.add(userId);

  if (!isReady()) {
    dirtyUsers.delete(userId);
    return;
  }

  try {
    const keysetKey = getUserReportKeysetKey(userId);
    const keys = await redisClient.smembers(keysetKey);

    if (keys && keys.length > 0) {
      await redisClient.del(...keys, keysetKey);
    } else {
      await redisClient.del(keysetKey);
    }
    dirtyUsers.delete(userId);
  } catch (err) {
    console.warn('[Cache Notice] Failed to invalidate report cache:', err.message);
    // Keep user in dirtyUsers so getCachedReport will bypass stale cache
    dirtyUsers.add(userId);
  }
}

/**
 * For testing: manually flag a user as dirty to simulate invalidation failure.
 *
 * @param {string} userId
 */
function markUserDirtyForTest(userId) {
  dirtyUsers.add(userId);
}

module.exports = {
  getReportCacheKey,
  getUserReportKeysetKey,
  getCachedReport,
  setCachedReport,
  invalidateUserReports,
  markUserDirtyForTest
};
