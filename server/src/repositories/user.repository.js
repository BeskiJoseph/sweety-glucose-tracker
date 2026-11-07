const { query } = require('../config/db');

/**
 * Create a new user in PostgreSQL using parameterized query.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email - Normalized lowercase email
 * @param {string} params.passwordHash
 * @returns {Promise<object>} Inserted user without password hash
 */
async function createUser({ name, email, passwordHash }) {
  const sql = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at, updated_at
  `;
  const result = await query(sql, [name, email, passwordHash]);
  return result.rows[0];
}

/**
 * Find user by email (case-insensitive) including password hash for authentication.
 *
 * @param {string} email - Email address
 * @returns {Promise<object|null>} User object or null if not found
 */
async function findByEmail(email) {
  const sql = `
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `;
  const result = await query(sql, [email]);
  return result.rows[0] || null;
}

/**
 * Find user by ID returning safe user profile without password hash.
 *
 * @param {string} id - User UUID
 * @returns {Promise<object|null>} Safe user object or null if not found
 */
async function findById(id) {
  const sql = `
    SELECT id, name, email, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById
};
