/**
 * Quick Sanjeevani - Layer 3 Crash Resilience: Resilient Database Connection
 * Mongoose connection pool with auto-reconnection, backoff, and non-fatal degradation.
 */

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

const POOL_SIZE = 10;
const TIMEOUT_MS = 5000;

// Internal state tracking
const dbState = {
  status: 'disconnected', // 'connected' | 'disconnected' | 'reconnecting' | 'connecting'
  reconnectAttempts: 0,
  maxReconnectAttempts: 20,
  reconnectInterval: 2000,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  isIntentionalDisconnect: false,
};

let reconnectTimer = null;
let currentMongoUri = env.MONGODB_URI;

const mongooseOptions = {
  maxPoolSize: POOL_SIZE,
  serverSelectionTimeoutMS: TIMEOUT_MS,
  bufferCommands: false,
  autoIndex: true,
};

// Bind Mongoose connection event listeners
mongoose.connection.on('connecting', () => {
  dbState.status = 'connecting';
  logger.info('[DB:Layer3] Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  dbState.status = 'connected';
  dbState.lastConnectedAt = new Date();
  dbState.reconnectAttempts = 0;
  dbState.isIntentionalDisconnect = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  logger.info('[DB:Layer3] MongoDB connection established successfully');
});

mongoose.connection.on('disconnected', () => {
  dbState.status = 'disconnected';
  dbState.lastDisconnectedAt = new Date();
  logger.warn('[DB:Layer3] MongoDB connection lost / disconnected');

  if (!dbState.isIntentionalDisconnect) {
    scheduleReconnect();
  }
});

mongoose.connection.on('reconnected', () => {
  dbState.status = 'connected';
  dbState.reconnectAttempts = 0;
  logger.info('[DB:Layer3] MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error(`[DB:Layer3] MongoDB connection error: ${err.message}`);
  // Error does not crash the server; status is monitored
});

/**
 * Schedules an automatic reconnection attempt with backoff
 */
function scheduleReconnect(delay = null) {
  if (dbState.isIntentionalDisconnect) return;
  if (dbState.status === 'connecting' || dbState.status === 'reconnecting') return;

  dbState.status = 'reconnecting';
  dbState.reconnectAttempts += 1;

  const backoff = delay || Math.min(
    dbState.reconnectInterval * Math.pow(1.5, Math.min(dbState.reconnectAttempts, 6)),
    30000
  );

  logger.info(`[DB:Layer3] Reconnection attempt #${dbState.reconnectAttempts} scheduled in ${Math.round(backoff)}ms`);

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(currentMongoUri, mongooseOptions);
      }
    } catch (err) {
      logger.warn(`[DB:Layer3] Reconnect attempt #${dbState.reconnectAttempts} failed: ${err.message}`);
      dbState.status = 'disconnected';
      if (!dbState.isIntentionalDisconnect) {
        scheduleReconnect();
      }
    }
  }, backoff);

  // Allow Node process to exit even if timer is pending
  if (reconnectTimer && typeof reconnectTimer.unref === 'function') {
    reconnectTimer.unref();
  }
}

/**
 * Connect to MongoDB database
 * @param {string} [uri] Optional custom MongoDB URI
 * @returns {Promise<boolean>} True if connected, false if degraded
 */
async function connectDB(uri = null) {
  currentMongoUri = uri || env.MONGODB_URI;
  dbState.isIntentionalDisconnect = false;

  try {
    if (mongoose.connection.readyState === 1) {
      dbState.status = 'connected';
      return true;
    }

    dbState.status = 'connecting';
    await mongoose.connect(currentMongoUri, mongooseOptions);
    dbState.status = 'connected';
    return true;
  } catch (err) {
    logger.warn(`[DB:Layer3] Initial MongoDB connection failed: ${err.message}. Operating in degraded mode.`);
    dbState.status = 'disconnected';
    scheduleReconnect();
    return false;
  }
}

/**
 * Disconnect from MongoDB gracefully
 */
async function disconnectDB() {
  dbState.isIntentionalDisconnect = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    logger.error(`[DB:Layer3] Error disconnecting MongoDB: ${err.message}`);
  } finally {
    dbState.status = 'disconnected';
  }
}

/**
 * Get live database connection status and metrics
 */
function getConnectionStatus() {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyStateName = readyStates[mongoose.connection.readyState] || 'unknown';

  let normalizedStatus = dbState.status;
  if (mongoose.connection.readyState === 1) {
    normalizedStatus = 'connected';
  } else if (dbState.status === 'reconnecting') {
    normalizedStatus = 'reconnecting';
  } else {
    normalizedStatus = 'disconnected';
  }

  return {
    status: normalizedStatus,
    readyState: mongoose.connection.readyState,
    readyStateName,
    poolSize: POOL_SIZE,
    host: mongoose.connection.host || 'localhost',
    name: mongoose.connection.name || 'quick_sanjeevani',
    reconnectAttempts: dbState.reconnectAttempts,
    lastConnectedAt: dbState.lastConnectedAt,
    lastDisconnectedAt: dbState.lastDisconnectedAt,
  };
}

/**
 * Test helper to simulate connection states
 */
function setTestStatus(status) {
  dbState.status = status;
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  scheduleReconnect,
  setTestStatus,
  dbState,
  mongooseOptions,
};
