const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env in server directory if present
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const NODE_ENV = process.env.NODE_ENV || 'development';
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

module.exports = {
  NODE_ENV,
  PORT,
  CLIENT_URL,
  isProduction: NODE_ENV === 'production',
  isDevelopment: NODE_ENV === 'development',
  isTest: NODE_ENV === 'test'
};
