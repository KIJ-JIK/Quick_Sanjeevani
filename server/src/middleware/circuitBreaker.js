/**
 * Quick Sanjeevani - Layer 4 Crash Resilience: Circuit Breaker
 * Uses Opossum to wrap external service calls (SMS, WhatsApp, OCR, TTS)
 * with timeout triggers, fallback executions, and health monitoring.
 */

const CircuitBreaker = require('opossum');
const logger = require('../config/logger');

const DEFAULT_OPTIONS = {
  timeout: 3000, // Trigger timeout after 3000ms
  errorThresholdPercentage: 50, // Open circuit when >= 50% of requests fail
  resetTimeout: 5000, // Wait 5000ms before testing recovery in HALF_OPEN
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
};

// Registry of active circuit breakers
const breakers = new Map();

/**
 * Returns string state of a circuit breaker ('CLOSED', 'OPEN', 'HALF_OPEN')
 */
function getBreakerState(breaker) {
  if (!breaker) return 'CLOSED';
  if (breaker.opened) return 'OPEN';
  if (breaker.halfOpen) return 'HALF_OPEN';
  return 'CLOSED';
}

/**
 * Creates and registers an Opossum circuit breaker
 * @param {string} name Unique identifier for the breaker
 * @param {Function} asyncAction The async function to execute
 * @param {Object} options Configuration overrides
 * @param {Function} fallback Optional fallback function
 */
function createCircuitBreaker(name, asyncAction, options = {}, fallback = null) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const breaker = new CircuitBreaker(asyncAction, mergedOptions);

  if (typeof fallback === 'function') {
    breaker.fallback(fallback);
  }

  // Event handlers for telemetry & logging
  breaker.on('open', () => {
    logger.warn(`[CircuitBreaker:Layer4] Breaker '${name}' transitioned to OPEN`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`[CircuitBreaker:Layer4] Breaker '${name}' transitioned to HALF_OPEN (probing health)`);
  });

  breaker.on('close', () => {
    logger.info(`[CircuitBreaker:Layer4] Breaker '${name}' transitioned to CLOSED (healthy)`);
  });

  breaker.on('timeout', () => {
    logger.warn(`[CircuitBreaker:Layer4] Action on breaker '${name}' timed out after ${mergedOptions.timeout}ms`);
  });

  breaker.on('fallback', (result) => {
    logger.info(`[CircuitBreaker:Layer4] Fallback executed on breaker '${name}'`);
  });

  breaker.on('failure', (err) => {
    logger.warn(`[CircuitBreaker:Layer4] Execution failure on breaker '${name}': ${err.message}`);
  });

  breakers.set(name, breaker);
  return breaker;
}

// Pre-create the standard external service breaker
const externalServicesBreaker = createCircuitBreaker(
  'externalServices',
  async (serviceCall) => {
    if (typeof serviceCall === 'function') {
      return await serviceCall();
    }
    return serviceCall;
  },
  { timeout: 3000, errorThresholdPercentage: 50 },
  (error) => {
    return {
      status: 'fallback',
      message: 'External service call bypassed via circuit breaker fallback',
      error: error ? error.message : 'Service unavailable',
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Get states of all registered circuit breakers for `/health` endpoint
 * @returns {Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>}
 */
function getCircuitBreakerStatus() {
  const status = {};
  for (const [name, breaker] of breakers.entries()) {
    status[name] = getBreakerState(breaker);
  }
  return status;
}

/**
 * Retrieves a breaker by name
 */
function getBreaker(name) {
  return breakers.get(name);
}

/**
 * Resets all breakers to closed state (useful for tests)
 */
function resetAllBreakers() {
  for (const breaker of breakers.values()) {
    if (breaker.opened || breaker.halfOpen) {
      breaker.close();
    }
    breaker.clearCache();
  }
}

module.exports = {
  createCircuitBreaker,
  getCircuitBreakerStatus,
  getBreaker,
  resetAllBreakers,
  externalServicesBreaker,
  DEFAULT_OPTIONS,
};
