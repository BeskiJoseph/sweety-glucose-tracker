const { verifyToken } = require('../utils/token.util');
const { AUTH_COOKIE_NAME } = require('../constants/auth.constants');
const AppError = require('../errors/AppError');

/**
 * Middleware to authenticate requests via secure HTTP-only cookie or Bearer token.
 */
function requireAuth(req, res, next) {
  // Extract token from HTTP-only cookie (primary) or Authorization header (fallback for testing/API clients)
  let token = req.cookies ? req.cookies[AUTH_COOKIE_NAME] : null;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return next(
      new AppError('Authentication required. Please sign in to continue.', 401)
    );
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return next(new AppError('Invalid authentication token payload.', 401));
    }

    // Attach verified user strictly from the decoded cryptographic token
    req.user = {
      id: decoded.userId,
      role: decoded.role || 'patient'
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError('Session expired. Please sign in again.', 401)
      );
    }
    return next(
      new AppError('Invalid authentication token. Please sign in again.', 401)
    );
  }
}

module.exports = {
  requireAuth
};
