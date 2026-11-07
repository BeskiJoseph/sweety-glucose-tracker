const bcrypt = require('bcrypt');
const { BCRYPT_SALT_ROUNDS } = require('../constants/auth.constants');

/**
 * Hash plaintext password using bcrypt with standard salt rounds.
 *
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Password hash
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare plaintext password with stored bcrypt hash.
 *
 * @param {string} password - Plaintext candidate password
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>} True if matching, false otherwise
 */
async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword
};
