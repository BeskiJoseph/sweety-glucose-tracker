const userRepository = require('../repositories/user.repository');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signToken } = require('../utils/token.util');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const AppError = require('../errors/AppError');

/**
 * Format user database row into safe client-facing user object.
 *
 * @param {object} user - Database user row
 * @returns {object} Safe user object
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'patient',
    createdAt: user.created_at || user.createdAt
  };
}

/**
 * Register a new user account.
 *
 * @param {object} payload - { name, email, password }
 * @returns {Promise<{ user: object, token: string }>}
 */
async function register(payload) {
  const { name, email, password } = validateRegister(payload);

  // Check for duplicate email
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Hash password with bcrypt
  const passwordHash = await hashPassword(password);

  // Persist user with parameterized SQL
  let newUser;
  try {
    newUser = await userRepository.createUser({
      name,
      email,
      passwordHash
    });
  } catch (error) {
    // Handle unique constraint race condition
    if (error.code === '23505') {
      throw new AppError('An account with this email already exists', 409);
    }
    throw error;
  }

  // Generate JWT token
  const token = signToken({ userId: newUser.id, role: newUser.role || 'patient' });

  return {
    user: sanitizeUser(newUser),
    token
  };
}

/**
 * Authenticate existing user with email and password.
 *
 * @param {object} payload - { email, password }
 * @returns {Promise<{ user: object, token: string }>}
 */
async function login(payload) {
  const { email, password } = validateLogin(payload);

  // Generic error message for both non-existent user and incorrect password
  const invalidCredentialsError = new AppError('Invalid email or password', 401);

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw invalidCredentialsError;
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw invalidCredentialsError;
  }

  // Generate JWT token
  const token = signToken({ userId: user.id, role: user.role || 'patient' });

  return {
    user: sanitizeUser(user),
    token
  };
}

/**
 * Get current authenticated user profile by ID.
 *
 * @param {string} userId - User UUID from verified JWT token
 * @returns {Promise<object>} Safe user profile
 */
async function getCurrentUser(userId) {
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found or session has expired', 401);
  }

  return sanitizeUser(user);
}

module.exports = {
  register,
  login,
  getCurrentUser
};
