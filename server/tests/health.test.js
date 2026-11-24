/**
 * Quick Sanjeevani - Health & System Status Tests
 * Validates /health endpoint, metrics, and degraded state reporting
 */

const request = require('supertest');
const app = require('../src/app');
const { setTestStatus } = require('../src/config/db');

describe('Health Check & System Telemetry Endpoint', () => {
  afterEach(() => {
    // Reset DB status to connected or disconnected
    setTestStatus('connected');
  });

  test('GET /health returns HTTP 200 and healthy telemetry when database is connected', async () => {
    setTestStatus('connected');

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);

    // Memory usage
    expect(res.body).toHaveProperty('memory');
    expect(res.body.memory).toHaveProperty('heapUsedMb');
    expect(res.body.memory).toHaveProperty('heapTotalMb');
    expect(res.body.memory).toHaveProperty('rssMb');

    // Database telemetry
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('poolSize', 10);
    expect(res.body.database).toHaveProperty('status');

    // Circuit breaker state
    expect(res.body).toHaveProperty('circuitBreakers');
    expect(res.body.circuitBreakers).toHaveProperty('externalServices');
    expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(res.body.circuitBreakers.externalServices);

    expect(res.body).toHaveProperty('timestamp');
  });

  test('GET /health returns HTTP 200 with degraded status when database is disconnected', async () => {
    setTestStatus('disconnected');

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database.status).toBe('disconnected');
    expect(res.body.database.poolSize).toBe(10);
  });

  test('GET /health returns HTTP 200 with degraded status when database is reconnecting', async () => {
    setTestStatus('reconnecting');

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database.status).toBe('reconnecting');
  });
});
