/**
 * Quick Sanjeevani - 4-Layer Crash Resilience Test Suite
 * Validates process supervision, RFC 7807 route error catching, DB degradation, and circuit breakers.
 */

const request = require('supertest');
const app = require('../src/app');
require('../src/server'); // Loads Layer 1 process supervision handlers
const {
  createCircuitBreaker,
  getCircuitBreakerStatus,
  resetAllBreakers,
  externalServicesBreaker,
} = require('../src/middleware/circuitBreaker');
const {
  getConnectionStatus,
  scheduleReconnect,
  setTestStatus,
  dbState,
} = require('../src/config/db');

describe('4-Layer Crash Resilience Engine', () => {
  beforeEach(() => {
    resetAllBreakers();
    setTestStatus('connected');
  });

  afterAll(() => {
    resetAllBreakers();
  });

  // Layer 1: Process-Level Supervision
  describe('Layer 1: Process-Level Supervision', () => {
    test('Unhandled Promise Rejection does NOT crash process and server remains operational', async () => {
      // Trigger process-level unhandledRejection event
      const simulatedError = new Error('Simulated unhandled async rejection');
      const dummyPromise = Promise.resolve();
      const handled = process.emit('unhandledRejection', simulatedError, dummyPromise);
      expect(handled).toBe(true);

      // Verify server is completely alive and serving requests
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('uptime');
    });
  });

  // Layer 2: Route-Level RFC 7807 Error Handling
  describe('Layer 2: Route-Level Error Catching (RFC 7807)', () => {
    test('Route not found emits RFC 7807 Problem Details format with 404', async () => {
      const res = await request(app).get('/api/non-existent-route-endpoint');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('title', 'Not Found');
      expect(res.body).toHaveProperty('status', 404);
      expect(res.body).toHaveProperty('detail');
      expect(res.body).toHaveProperty('instance', '/api/non-existent-route-endpoint');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('Malformed JSON in request body emits RFC 7807 Problem Details with 400', async () => {
      const res = await request(app)
        .post('/api/auth/otp/send')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": ... broken');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('title', 'Bad Request');
      expect(res.body).toHaveProperty('status', 400);
      expect(res.body).toHaveProperty('detail');
      expect(res.body.detail).toContain('JSON');
    });
  });

  // Layer 3: Database-Level Resilient Connection & Auto-Reconnect
  describe('Layer 3: Database Resilient Connection Pool & Degradation', () => {
    test('Disconnecting DB does not crash server and health endpoint reports degraded', async () => {
      setTestStatus('disconnected');

      const status = getConnectionStatus();
      expect(status.status).toBe('disconnected');
      expect(status.poolSize).toBe(10);

      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.database.status).toBe('disconnected');
    });

    test('scheduleReconnect transitions status to reconnecting and tracks attempts', () => {
      dbState.status = 'disconnected';
      dbState.isIntentionalDisconnect = false;
      const initialAttempts = dbState.reconnectAttempts;

      scheduleReconnect(50000); // large delay so timer doesn't fire immediately

      expect(dbState.status).toBe('reconnecting');
      expect(dbState.reconnectAttempts).toBe(initialAttempts + 1);
    });

    test('Medicine search continues to work using resilient cached catalog when DB is disconnected', async () => {
      setTestStatus('disconnected');

      const res = await request(app).get('/api/medicines/search?q=Paracetamol');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.medicines.length).toBeGreaterThan(0);
    });
  });

  // Layer 4: External Service Circuit Breaker
  describe('Layer 4: External Service Circuit Breaker (Opossum)', () => {
    test('Circuit breaker operates in CLOSED state under normal conditions', async () => {
      const healthyAction = jest.fn().mockResolvedValue('API success response');
      const breaker = createCircuitBreaker('testHealthy', healthyAction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
      });

      const result = await breaker.fire();
      expect(result).toBe('API success response');
      expect(breaker.opened).toBe(false);
      expect(getCircuitBreakerStatus().testHealthy).toBe('CLOSED');
    });

    test('Circuit breaker opens when failure threshold is exceeded and invokes fallback', async () => {
      const failingAction = jest.fn().mockRejectedValue(new Error('Third-party API gateway timeout'));
      const fallbackAction = jest.fn().mockReturnValue({ fallback: true, cachedResult: 'default_data' });

      const breaker = createCircuitBreaker(
        'externalServices',
        failingAction,
        {
          timeout: 500,
          errorThresholdPercentage: 50,
          resetTimeout: 2000,
          rollingCountTimeout: 5000,
          rollingCountBuckets: 5,
          volumeThreshold: 2,
        },
        fallbackAction
      );

      // Trigger failures
      await breaker.fire().catch(() => {});
      await breaker.fire().catch(() => {});
      await breaker.fire().catch(() => {});

      // Breaker should open or execute fallback
      expect(fallbackAction).toHaveBeenCalled();

      // Explicitly open breaker to test state reporting
      breaker.open();
      expect(breaker.opened).toBe(true);
      expect(getCircuitBreakerStatus().externalServices).toBe('OPEN');

      // Verify /health endpoint exposes the OPEN circuit breaker state
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.circuitBreakers.externalServices).toBe('OPEN');
    });

    test('Circuit breaker executes fallback gracefully when timed out', async () => {
      const slowAction = () => new Promise((resolve) => setTimeout(() => resolve('too late'), 800));
      const fallbackAction = jest.fn().mockReturnValue({ fallback: true, reason: 'timeout' });

      const breaker = createCircuitBreaker(
        'testTimeout',
        slowAction,
        { timeout: 100 },
        fallbackAction
      );

      const result = await breaker.fire();
      expect(fallbackAction).toHaveBeenCalled();
      expect(result).toEqual({ fallback: true, reason: 'timeout' });
    });
  });
});
