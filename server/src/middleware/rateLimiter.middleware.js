const AppError = require('../errors/AppError');

// In-memory record tracking for login attempts: ip -> { count: number, resetTime: number }
const attemptsMap = new Map();

// Configuration: 10 attempts per 15-minute fixed window
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Maximum number of client records tracked concurrently to bound memory consumption
const MAX_TRACKED_CLIENTS = 10000;

/**
 * Remove all expired records from the tracking map.
 *
 * @param {number} [now=Date.now()]
 */
function pruneExpiredEntries(now = Date.now()) {
  for (const [key, record] of attemptsMap.entries()) {
    if (now > record.resetTime) {
      attemptsMap.delete(key);
    }
  }
}

// Periodic cleanup of expired entries every 5 minutes to release stale records
const cleanupInterval = setInterval(() => {
  pruneExpiredEntries();
}, 5 * 60 * 1000);

cleanupInterval.unref();

/**
 * Dependency-free, in-memory fixed-window rate limiter for login endpoints
 * to protect against brute-force attacks while enforcing strict memory bounds.
 *
 * Fixed-window algorithm:
 * - Each client IP is tracked within a fixed time window of 15 minutes.
 * - The counter increments per request up to MAX_ATTEMPTS (10).
 * - When the fixed reset time expires, the counter and reset window start fresh.
 * - Memory usage is bounded: if tracked entries reach MAX_TRACKED_CLIENTS,
 *   expired entries are proactively pruned; if still at capacity, the oldest
 *   entries are evicted in FIFO order.
 */
function authRateLimiter(req, res, next) {
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  const record = attemptsMap.get(clientIp);

  if (!record || now > record.resetTime) {
    // If approaching or exceeding memory threshold, proactively prune expired records
    if (attemptsMap.size >= MAX_TRACKED_CLIENTS) {
      pruneExpiredEntries(now);
    }

    // If still at capacity after pruning, evict oldest entry to enforce strict memory ceiling
    while (attemptsMap.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = attemptsMap.keys().next().value;
      attemptsMap.delete(oldestKey);
    }

    attemptsMap.set(clientIp, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return next(
      new AppError(
        `Too many login attempts. Please wait ${retryAfterSeconds} seconds before trying again.`,
        429
      )
    );
  }

  record.count += 1;
  return next();
}

/**
 * Helper to reset rate limiter in automated test suites.
 */
function resetRateLimiter() {
  attemptsMap.clear();
}

/**
 * Helper to inspect internal map size and state in tests.
 */
function getRateLimiterStats() {
  return {
    size: attemptsMap.size,
    maxTrackedClients: MAX_TRACKED_CLIENTS,
    windowMs: WINDOW_MS,
    maxAttempts: MAX_ATTEMPTS
  };
}

module.exports = {
  authRateLimiter,
  resetRateLimiter,
  pruneExpiredEntries,
  getRateLimiterStats,
  WINDOW_MS,
  MAX_ATTEMPTS,
  MAX_TRACKED_CLIENTS
};
