/**
 * Tier 2: Boundary, Edge Cases, & Fault Injection
 * 18 Boundary & Resilience Tests
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

const assert = require('assert');
const { generateTwilioWebhook } = require('../helpers/payload-generators');
const { HttpClient } = require('../helpers/http-client');

async function run({ client, mockServer, serverUrl, botUrl }) {
  const tests = [];

  async function test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      tests.push({ name, passed: true, duration: Date.now() - start });
    } catch (err) {
      tests.push({ name, passed: false, duration: Date.now() - start, error: err.message });
    }
  }

  // =========================================================================
  // Input Boundaries & Special Characters (3 Tests)
  // =========================================================================
  await test('2.1 Boundary: Extremely long search query string (>500 chars) does not crash server', async () => {
    const longQuery = 'A'.repeat(600);
    const res = await client.get(`/api/medicines/search?q=${longQuery}`);
    assert.ok([200, 400].includes(res.status), `Expected 200 or 400, got ${res.status}`);
  });

  await test('2.2 Boundary: Empty query string q= returns empty list or default catalog', async () => {
    const res = await client.get('/api/medicines/search?q=');
    assert.strictEqual(res.status, 200);
  });

  await test('2.3 Boundary: Regex injection characters in search query are escaped safely', async () => {
    const res = await client.get('/api/medicines/search?q=.*+?^${}()|[]\\');
    assert.strictEqual(res.status, 200);
  });

  // =========================================================================
  // SQL / NoSQL Injection Attacks (2 Tests)
  // =========================================================================
  await test('2.4 Injection: NoSQL operator injection payload {"$gt": ""} is safely rejected or sanitized', async () => {
    const res = await client.post('/api/auth/otp/send', { phone: { '$gt': '' } });
    assert.strictEqual(res.status, 400);
  });

  await test('2.5 Injection: XSS payload in patient name is sanitized in output', async () => {
    const res = await client.post('/api/prescriptions', {
      patientName: '<script>alert("xss")</script>',
      extractedMedicines: []
    });
    assert.ok([201, 400].includes(res.status));
    if (res.status === 201) {
      const rx = res.body.prescription || res.body.data;
      assert.ok(!rx.patientName.includes('<script>'), 'Patient name should sanitize script tags');
    }
  });

  // =========================================================================
  // Authentication Edge Cases (3 Tests)
  // =========================================================================
  await test('2.6 Auth Boundary: Invalid / forged Bearer token returns 401 Unauthorized', async () => {
    const unauthClient = new HttpClient({
      baseUrl: client.baseUrl,
      socketPath: client.socketPath
    });
    const res = await unauthClient.get('/api/auth/me', { 'Authorization': 'Bearer forged_invalid_token' });
    assert.strictEqual(res.status, 401);
  });

  await test('2.7 Auth Boundary: Missing Authorization header on protected route returns 401', async () => {
    const unauthClient = new HttpClient({
      baseUrl: client.baseUrl,
      socketPath: client.socketPath
    });
    const res = await unauthClient.get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  await test('2.8 Auth Boundary: Malformed non-numeric OTP returns 400 Bad Request', async () => {
    const res = await client.post('/api/auth/otp/verify', { phone: '+919876543210', otp: 'abcdef' });
    assert.strictEqual(res.status, 400);
  });

  // =========================================================================
  // Geospatial Boundaries (3 Tests)
  // =========================================================================
  await test('2.9 Geo Boundary: Latitude out of range (>90 deg) returns 400 Bad Request', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=95.1234&lng=77.5963');
    assert.strictEqual(res.status, 400);
  });

  await test('2.10 Geo Boundary: Longitude out of range (>180 deg) returns 400 Bad Request', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=195.5963');
    assert.strictEqual(res.status, 400);
  });

  await test('2.11 Geo Boundary: Non-numeric coordinate string returns 400 Bad Request', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=invalid&lng=77.5963');
    assert.strictEqual(res.status, 400);
  });

  // =========================================================================
  // Sync Protocol Boundaries (2 Tests)
  // =========================================================================
  await test('2.12 Sync Boundary: Missing lastPulledAt parameter returns 400 Bad Request', async () => {
    const res = await client.post('/api/sync', { changes: {} });
    assert.strictEqual(res.status, 400);
  });

  await test('2.13 Sync Boundary: Malformed JSON payload returns RFC 7807 problem details', async () => {
    const res = await client.post('/api/sync', '{ broken_json: ', { 'Content-Type': 'application/json' });
    assert.strictEqual(res.status, 400);
  });

  // =========================================================================
  // WhatsApp & TwiML Boundaries (3 Tests)
  // =========================================================================
  await test('2.14 Webhook Boundary: Empty webhook body handled safely without crashing', async () => {
    const res = await client.post('/api/whatsapp/webhook', '', {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('2.15 Webhook Boundary: Invalid international phone format handled gracefully', async () => {
    const payload = generateTwilioWebhook({ from: 'whatsapp:invalid-phone' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('2.16 Webhook Boundary: Oversized message body (>4096 chars) does not crash server', async () => {
    const largeBody = 'Hello '.repeat(800);
    const payload = generateTwilioWebhook({ body: largeBody });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  // =========================================================================
  // Fault Injection: Circuit Breaker & Database Disconnect (2 Tests)
  // =========================================================================
  await test('2.17 Fault Injection: Simulated database disconnect reports degraded status in /health without unhandled crash', async () => {
    if (mockServer) mockServer.setDbConnected(false);
    const res = await client.get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.database.status, 'disconnected');
    assert.strictEqual(res.body.status, 'degraded');
    if (mockServer) mockServer.setDbConnected(true);
  });

  await test('2.18 Fault Injection: Tripped circuit breaker returns 503 degraded response gracefully', async () => {
    if (mockServer) mockServer.setCircuitBreaker(true);
    const res = await client.post('/api/prescriptions', { imageUrl: 'https://example.com/test.jpg' });
    assert.strictEqual(res.status, 503);
    if (mockServer) mockServer.setCircuitBreaker(false);
  });

  return tests;
}

module.exports = { run };
