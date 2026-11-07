const authService = require('../services/auth.service');
const { getAuthCookieOptions, getClearCookieOptions } = require('../utils/token.util');
const { AUTH_COOKIE_NAME } = require('../constants/auth.constants');

/**
 * Handle user registration: POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { user, token } = await authService.register(req.body);

    // Set secure HTTP-only cookie with JWT
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    // Return safe user information only (never expose passwords, hashes, or tokens)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle user login: POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { user, token } = await authService.login(req.body);

    // Set secure HTTP-only cookie with JWT
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    // Return safe user information only
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle session validation / get current user: GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle logout: POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    // Clear session cookie using matching security options
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
  logout
};
