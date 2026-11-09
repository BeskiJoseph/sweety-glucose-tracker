const Redis = require('ioredis');
const { REDIS_URL } = require('./env');

let redisClient = null;
let isRedisConnected = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      // Don't retry infinitely so background test processes can exit cleanly
      if (times > 3) {
        return null;
      }
      return Math.min(times * 200, 2000);
    }
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('[Redis] Connected successfully to Redis.');
  });

  redisClient.on('ready', () => {
    isRedisConnected = true;
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    // Suppress spammy connection refused logs in environments without local Redis
    if (err.code !== 'ECONNREFUSED') {
      console.warn(`[Redis Notice]: ${err.message}`);
    }
  });

  redisClient.on('close', () => {
    isRedisConnected = false;
  });

  // Attempt initial non-blocking connection
  redisClient.connect().catch(() => {
    // If Redis is not available locally, fail soft
    isRedisConnected = false;
  });
} catch (err) {
  console.warn('[Redis] Failed to initialize Redis client:', err.message);
  redisClient = null;
  isRedisConnected = false;
}

/**
 * Check if Redis is connected and ready to accept operations.
 *
 * @returns {boolean}
 */
function isReady() {
  return Boolean(redisClient && isRedisConnected && redisClient.status === 'ready');
}

/**
 * Cleanly close Redis connection on server termination.
 */
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
  }
}

module.exports = {
  redisClient,
  isReady,
  closeRedis
};
