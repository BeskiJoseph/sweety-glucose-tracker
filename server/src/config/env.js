const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env in server directory if present
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

const rawPort = process.env.PORT || '5000';
const PORT = parseInt(rawPort, 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Validate NODE_ENV
const allowedEnvironments = ['development', 'production', 'test'];
if (!allowedEnvironments.includes(NODE_ENV)) {
  throw new Error(
    `Invalid environment configuration: NODE_ENV must be one of [${allowedEnvironments.join(', ')}], received "${NODE_ENV}"`
  );
}

// Validate PORT
if (isNaN(PORT) || PORT <= 0 || PORT > 65535 || String(PORT) !== String(parseInt(rawPort, 10))) {
  throw new Error(
    `Invalid environment configuration: PORT must be an integer between 1 and 65535, received "${rawPort}"`
  );
}

// Validate CLIENT_URL: must be a valid HTTP/HTTPS origin (no path, query, or fragment)
try {
  const parsedUrl = new URL(CLIENT_URL);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Protocol must be http: or https:');
  }
  if (parsedUrl.origin !== CLIENT_URL) {
    throw new Error('URL must be an origin without path, query, or fragment (e.g. http://localhost:5173)');
  }
} catch (error) {
  throw new Error(
    `Invalid environment configuration: CLIENT_URL must be a valid HTTP/HTTPS origin without path, query, or fragment, received "${CLIENT_URL}". (${error.message})`
  );
}

// Validate DATABASE_URL
const DATABASE_URL =
  process.env.DATABASE_URL ||
  (!isProduction ? 'postgres://postgres:root@localhost:5432/sweety_db' : '');

if (isProduction && !DATABASE_URL) {
  throw new Error('Invalid environment configuration: DATABASE_URL is required in production.');
}

// Validate JWT_SECRET: must come from environment variables and must not be insecure
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'Invalid environment configuration: JWT_SECRET is required and must be provided via environment variables.'
  );
}

const minSecretLength = isProduction ? 32 : 16;
if (JWT_SECRET.length < minSecretLength) {
  throw new Error(
    `Invalid environment configuration: JWT_SECRET is insecure. Must be at least ${minSecretLength} characters long in ${NODE_ENV} mode.`
  );
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

module.exports = {
  NODE_ENV,
  PORT,
  CLIENT_URL,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  isProduction,
  isDevelopment,
  isTest
};
