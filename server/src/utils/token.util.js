const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, isProduction } = require('../config/env');
const { COOKIE_MAX_AGE_MS } = require('../constants/auth.constants');

/**
 * Sign JWT token for user session.
 *
 * @param {object} payload - Claims to include in JWT (e.g. { userId })
 * @returns {string} Signed JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verify JWT token and return decoded payload.
 *
 * @param {string} token - JWT token string
 * @returns {object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Get secure cookie options for setting the authentication token cookie.
 *
 * @returns {import('express').CookieOptions}
 */
function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  };
}

/**
 * Get cookie options for clearing the authentication token cookie on logout.
 * Must match the path, sameSite, and security attributes of the set cookie.
 *
 * @returns {import('express').CookieOptions}
 */
function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  };
}

module.exports = {
  signToken,
  verifyToken,
  getAuthCookieOptions,
  getClearCookieOptions
};
