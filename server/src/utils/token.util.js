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
 * Get base cookie security options matching the frontend/backend deployment arrangement.
 *
 * In production:
 * - httpOnly: true (prevents client-side script access, mitigating XSS token theft)
 * - secure: true (enforces HTTPS transmission)
 * - sameSite: 'strict' (highest CSRF protection on same-site origins)
 *
 * In development:
 * - httpOnly: true
 * - secure: false (allows HTTP transport across localhost)
 * - sameSite: 'lax' (permits cross-port localhost requests from Vite client to Express server)
 *
 * @returns {import('express').CookieOptions}
 */
function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  };
}

/**
 * Get secure cookie options for setting the authentication token cookie.
 *
 * @returns {import('express').CookieOptions}
 */
function getAuthCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: COOKIE_MAX_AGE_MS
  };
}

/**
 * Get cookie options for clearing the authentication token cookie on logout.
 * Must exactly match the path, sameSite, httpOnly, and secure attributes of the set cookie
 * so the browser properly deletes it.
 *
 * @returns {import('express').CookieOptions}
 */
function getClearCookieOptions() {
  return getBaseCookieOptions();
}

module.exports = {
  signToken,
  verifyToken,
  getAuthCookieOptions,
  getClearCookieOptions
};
