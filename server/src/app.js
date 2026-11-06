const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { CLIENT_URL } = require('./config/env');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// Security headers with Helmet
app.use(helmet());

// Cross-Origin Resource Sharing with specific client origin and credentials
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Body parsers with 10 KB size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser for HTTP-only cookies
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sweety API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use(notFoundMiddleware);

// Centralized error handling
app.use(errorMiddleware);

module.exports = app;
