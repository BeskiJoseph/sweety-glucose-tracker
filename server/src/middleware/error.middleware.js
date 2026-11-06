const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Handle body-parser malformed JSON syntax errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received',
      statusCode: 400
    });
  }

  // Handle body-parser payload limit exceeded
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload exceeds 10 KB limit',
      statusCode: 413
    });
  }

  // Determine HTTP status code
  const statusCode =
    Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  // Log diagnostic information on the server
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`[WARN] ${req.method} ${req.originalUrl} (${statusCode}): ${err.message}`);
  }

  // Safe client message: HTTP 4xx errors return client-facing messages; HTTP 5xx errors always return 'Internal server error'
  const message = statusCode >= 500 ? 'Internal server error' : (err.message || 'Client error');

  return res.status(statusCode).json({
    success: false,
    message,
    statusCode
  });
};

module.exports = errorMiddleware;
