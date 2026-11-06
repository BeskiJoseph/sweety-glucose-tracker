const { PORT, NODE_ENV } = require('./config/env');
const app = require('./app');

let server;

try {
  server = app.listen(PORT, () => {
    console.log(`[Sweety API] Server started on port ${PORT} in ${NODE_ENV} mode`);
  });
} catch (err) {
  console.error('[Sweety API] Failed to start server:', err);
  process.exit(1);
}

// Handle startup errors (e.g. EADDRINUSE)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Sweety API] Port ${PORT} is already in use. Please choose another port or terminate the existing process.`);
  } else {
    console.error('[Sweety API] Server error encountered:', err);
  }
  process.exit(1);
});

// Shutdown handling (graceful for termination signals, non-zero exit for fatal errors)
let isShuttingDown = false;

const shutdown = (reason, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  const isFatal = exitCode !== 0;
  if (isFatal) {
    console.error(`[Sweety API] Fatal event (${reason}). Initiating server termination...`);
  } else {
    console.log(`[Sweety API] Received ${reason}. Closing HTTP server gracefully...`);
  }

  // Force exit after 10 seconds if connections do not close
  const timer = setTimeout(() => {
    console.error('[Sweety API] Forceful process exit triggered after shutdown timeout.');
    process.exit(1);
  }, 10000);
  timer.unref();

  if (server && server.listening) {
    server.close((err) => {
      if (err) {
        console.error('[Sweety API] Error while closing HTTP server:', err);
        process.exit(1);
      }
      if (isFatal) {
        console.error(`[Sweety API] HTTP server closed following fatal error (${reason}). Process exiting with code ${exitCode}.`);
      } else {
        console.log('[Sweety API] HTTP server closed cleanly. Process exiting.');
      }
      process.exit(exitCode);
    });
  } else {
    process.exit(exitCode);
  }
};

// Graceful shutdown handlers (SIGINT and SIGTERM -> exit code 0)
process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));

// Fatal error handlers (uncaughtException and unhandledRejection -> exit code 1)
process.on('uncaughtException', (err) => {
  console.error('[Sweety API] Uncaught Exception:', err);
  shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Sweety API] Unhandled Rejection:', reason);
  shutdown('unhandledRejection', 1);
});

module.exports = server;
