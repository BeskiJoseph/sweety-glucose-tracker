const path = require('path');
const fs = require('fs');
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

// Validate DATABASE_URL: must come from environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.trim()) {
  throw new Error(
    'Invalid environment configuration: DATABASE_URL is required and must be provided via environment variables.'
  );
}

try {
  const parsedDbUrl = new URL(DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(parsedDbUrl.protocol)) {
    throw new Error('Protocol must be postgres: or postgresql:');
  }
} catch (error) {
  throw new Error(
    `Invalid environment configuration: DATABASE_URL must be a valid PostgreSQL connection URL. (${error.message})`
  );
}

// Optional CA certificate for database SSL verification in production / cloud providers
let DATABASE_SSL_CA = process.env.DATABASE_SSL_CA || null;
if (DATABASE_SSL_CA) {
  DATABASE_SSL_CA = DATABASE_SSL_CA.trim();
  if (fs.existsSync(DATABASE_SSL_CA)) {
    try {
      DATABASE_SSL_CA = fs.readFileSync(DATABASE_SSL_CA, 'utf8');
    } catch (err) {
      throw new Error(
        `Invalid environment configuration: Failed to read DATABASE_SSL_CA from "${DATABASE_SSL_CA}": ${err.message}`
      );
    }
  }
}

// Validate JWT_SECRET: must come from environment variables and must not be insecure
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || !JWT_SECRET.trim()) {
  throw new Error(
    'Invalid environment configuration: JWT_SECRET is required and must be provided via environment variables.'
  );
}

const minSecretLength = isProduction ? 32 : 16;
if (JWT_SECRET.trim().length < minSecretLength) {
  throw new Error(
    `Invalid environment configuration: JWT_SECRET is insecure. Must be at least ${minSecretLength} characters long in ${NODE_ENV} mode.`
  );
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Redis configuration for report caching and BullMQ background reminders
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Validate REPORT_CACHE_TTL_SECONDS: must be a positive integer (> 0), default: 300
let REPORT_CACHE_TTL_SECONDS = 300;
const rawReportTtl = process.env.REPORT_CACHE_TTL_SECONDS;
if (rawReportTtl !== undefined && rawReportTtl.trim() !== '') {
  const trimmedTtl = rawReportTtl.trim();
  const parsedTtl = parseInt(trimmedTtl, 10);
  if (isNaN(parsedTtl) || String(parsedTtl) !== trimmedTtl || parsedTtl <= 0) {
    throw new Error(
      `Invalid environment configuration: REPORT_CACHE_TTL_SECONDS must be a positive integer (> 0), received "${rawReportTtl}"`
    );
  }
  REPORT_CACHE_TTL_SECONDS = parsedTtl;
}
const REMINDER_SCHEDULE_CRON = process.env.REMINDER_SCHEDULE_CRON || '0 20 * * *';
const REMINDER_TIMEZONE = process.env.REMINDER_TIMEZONE || 'UTC';

module.exports = {
  NODE_ENV,
  PORT,
  CLIENT_URL,
  DATABASE_URL,
  DATABASE_SSL_CA,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REDIS_URL,
  REPORT_CACHE_TTL_SECONDS,
  REMINDER_SCHEDULE_CRON,
  REMINDER_TIMEZONE,
  isProduction,
  isDevelopment,
  isTest
};
