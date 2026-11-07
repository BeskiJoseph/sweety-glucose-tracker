const { Pool } = require('pg');
const { DATABASE_URL, isProduction } = require('./env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: false } : false
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
  closePool
};
