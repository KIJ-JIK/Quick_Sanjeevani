/**
 * Quick Sanjeevani - Layer 1 Crash Resilience: Process Supervision & Server Entrypoint
 * Manages process-level exceptions, unhandled rejections, and graceful shutdowns.
 */

const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/db');

let server = null;
let isShuttingDown = false;

/**
 * Layer 1 Process-Level Crash Resilience:
 * 1. unhandledRejection: Logs error with stack trace and maintains process stability.
 *    Non-fatal: Node process remains running to serve ongoing and future requests.
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process:Layer1] Unhandled Promise Rejection detected (NON-FATAL):', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // Maintain process stability - do NOT call process.exit()
});

/**
 * 2. uncaughtException: Logs critical error and performs graceful termination.
 *    Fatal: Cleanly closes sockets and database pool before process restart by PM2.
 */
process.on('uncaughtException', (err) => {
  logger.error('[Process:Layer1] Critical Uncaught Exception (FATAL):', {
    message: err.message,
    stack: err.stack,
  });
  gracefulShutdown(1);
});

/**
 * Graceful termination handler for SIGINT, SIGTERM, and fatal crashes
 */
async function gracefulShutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[Process:Layer1] Initiating graceful server drain and shutdown (exit code: ${exitCode})...`);

  // Force termination safeguard if drain takes longer than 5 seconds
  const forceTimer = setTimeout(() => {
    logger.error('[Process:Layer1] Forced exit: Shutdown exceeded timeout deadline (5s).');
    process.exit(exitCode);
  }, 5000);

  if (forceTimer.unref) forceTimer.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('[Process:Layer1] HTTP server closed cleanly. No new connections accepted.');
    }

    await disconnectDB();
    logger.info('[Process:Layer1] Database connections drained and closed.');
  } catch (err) {
    logger.error(`[Process:Layer1] Error during graceful shutdown: ${err.message}`);
  } finally {
    clearTimeout(forceTimer);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(exitCode);
    }
  }
}

process.on('SIGINT', () => gracefulShutdown(0));
process.on('SIGTERM', () => gracefulShutdown(0));

/**
 * Boots the server and initializes resilient database connection
 */
async function startServer() {
  // Connect to database (non-fatal if MongoDB is temporarily unavailable)
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info(`====================================================`);
    logger.info(`   Quick Sanjeevani Server running on port ${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   Health endpoint: http://localhost:${env.PORT}/health`);
    logger.info(`====================================================`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  gracefulShutdown,
};
