const AppError = require('../errors/AppError');

// In-memory record tracking for login attempts: ip -> { count: number, resetTime: number }
const attemptsMap = new Map();

// Configuration: 10 attempts per 15-minute window
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Periodic cleanup of expired entries every 5 minutes to avoid memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptsMap.entries()) {
    if (now > record.resetTime) {
      attemptsMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

cleanupInterval.unref();

/**
 * Lightweight in-memory rate limiter for login endpoints to protect against brute-force attacks.
 */
function authRateLimiter(req, res, next) {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = attemptsMap.get(clientIp);

  if (!record || now > record.resetTime) {
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

module.exports = {
  authRateLimiter,
  resetRateLimiter
};
