const AppError = require('../errors/AppError');
const {
  MIN_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH
} = require('../constants/auth.constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate registration payload.
 *
 * @param {object} body
 * @param {string} body.name
 * @param {string} body.email
 * @param {string} body.password
 * @returns {{ name: string, email: string, password: string }} Sanitized & normalized values
 */
function validateRegister(body = {}) {
  const { name, email, password } = body;

  // Validate Name
  if (!name || typeof name !== 'string') {
    throw new AppError('Name is required and must be a string', 400);
  }
  const trimmedName = name.trim();
  if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
    throw new AppError(
      `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`,
      400
    );
  }

  // Validate Email
  if (!email || typeof email !== 'string') {
    throw new AppError('Email is required and must be a string', 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
    throw new AppError('Please provide a valid email address', 400);
  }

  // Validate Password
  if (!password || typeof password !== 'string') {
    throw new AppError('Password is required and must be a string', 400);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      400
    );
  }
  if (password.length > 128) {
    throw new AppError('Password must not exceed 128 characters', 400);
  }

  return {
    name: trimmedName,
    email: normalizedEmail,
    password
  };
}

/**
 * Validate login payload.
 *
 * @param {object} body
 * @param {string} body.email
 * @param {string} body.password
 * @returns {{ email: string, password: string }} Sanitized & normalized values
 */
function validateLogin(body = {}) {
  const { email, password } = body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new AppError('Email is required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  if (!password || typeof password !== 'string') {
    throw new AppError('Password is required', 400);
  }

  return {
    email: normalizedEmail,
    password
  };
}

module.exports = {
  validateRegister,
  validateLogin
};
