const { Pool } = require('pg');
const { DATABASE_URL, DATABASE_SSL_CA, isProduction } = require('./env');

/**
 * Configure PostgreSQL SSL options.
 *
 * In production:
 * - Certificate verification is strictly enforced (rejectUnauthorized: true).
 * - Optional custom CA certificate (DATABASE_SSL_CA) is attached if required by cloud provider.
 *
 * In non-production:
 * - SSL is disabled by default for local PostgreSQL instances.
 *
 * @param {boolean} [forceProduction] - Optional override for testing
 * @param {string|null} [customCa] - Optional CA certificate override for testing
 * @returns {object|boolean} SSL configuration object or false
 */
function getSslConfig(forceProduction = isProduction, customCa = DATABASE_SSL_CA) {
  // Production connections must ALWAYS verify TLS certificates.
  // DATABASE_SSL=false cannot disable SSL in production.
  if (forceProduction) {
    const sslConfig = {
      rejectUnauthorized: true
    };
    if (customCa) {
      sslConfig.ca = customCa;
    }
    return sslConfig;
  }

  // Non-production (development/test): SSL is disabled by default unless explicitly requested via DATABASE_SSL=true
  if (process.env.DATABASE_SSL === 'true') {
    const sslConfig = {
      rejectUnauthorized: true
    };
    if (customCa) {
      sslConfig.ca = customCa;
    }
    return sslConfig;
  }

  return false;
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: getSslConfig()
});

pool.on('error', (err) => {
  console.error('[Database Pool Error] Unexpected idle client error:', err.message);
});

/**
 * Execute parameterized query against PostgreSQL pool.
 *
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 100)}...`);
    }
    return res;
  } catch (error) {
    console.error(`[Database Query Error]: ${error.message}`);
    throw error;
  }
}

/**
 * Close database pool cleanly (used in testing and server shutdown).
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  closePool,
  getSslConfig
};
