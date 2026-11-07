/**
 * Authentication and Session Constants
 */

const AUTH_COOKIE_NAME = 'token';

// 7 days in milliseconds
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// bcrypt work factor
const BCRYPT_SALT_ROUNDS = 12;

// Validation constants
const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

module.exports = {
  AUTH_COOKIE_NAME,
  COOKIE_MAX_AGE_MS,
  BCRYPT_SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH
};
