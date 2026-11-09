const AppError = require('../errors/AppError');
const { query } = require('../config/db');

/**
 * Middleware to restrict route access strictly to users with verified 'doctor' role in PostgreSQL.
 * Does not trust the JWT role claim alone; verifies the current database record live
 * so that any demoted or deleted doctor immediately loses access.
 */
async function requireDoctor(req, res, next) {
  if (!req.user || !req.user.id) {
    return next(new AppError('Authentication required. Please sign in to continue.', 401));
  }

  try {
    const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) {
      return next(new AppError('User account not found', 404));
    }

    const currentRole = result.rows[0].role;
    if (currentRole !== 'doctor') {
      return next(new AppError('Access forbidden: Doctor role required', 403));
    }

    // Synchronize current verified database role into request context
    req.user.role = currentRole;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireDoctor
};
