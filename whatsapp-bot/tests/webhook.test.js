/**
 * Quick Sanjeevani — WhatsApp Bot Webhook Automated Tests
 * Validates Fast Webhook SLA (<50ms HTTP 200 TwiML), background dispatch detachment,
 * and boundary fault resilience under malformed / oversized payloads.
 */

const { TestClient } = require('./testHelper');
const twilioService = require('../src/services/twilioService');

describe('WhatsApp Bot Webhook & Fast ACK Engine', () => {
  let client;

  beforeAll(async () => {
    client = new TestClient();
    await client.start();
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  beforeEach(() => {
    twilioService.clearSentMessages();
  });

  test('1. Health check returns 200 with service status and uptime', async () => {
    const res = await client.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('quick-sanjeevani-whatsapp-bot');
    expect(typeof res.body.uptime).toBe('number');
  });

  test('2. Fast ACK: returns HTTP 200 <Response></Response> text/xml in <200ms', async () => {
    const payload = {
      From: 'whatsapp:+919876543210',
      To: 'whatsapp:+14155238886',
      Body: 'Namaste',
      NumMedia: '0'
    };

    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.rawBody).toContain('<Response></Response>');
    expect(res.duration).toBeLessThan(200);
  });

  test('3. Alias route: /webhook behaves identically to /api/whatsapp/webhook', async () => {
    const payload = {
      From: 'whatsapp:+919876543210',
      To: 'whatsapp:+14155238886',
      Body: 'Hi',
      NumMedia: '0'
    };

    const res = await client.post('/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.rawBody).toContain('<Response></Response>');
  });

  test('4. Detached background dispatch: async handler invokes without holding HTTP connection', async () => {
    const payload = {
      From: 'whatsapp:+919876543211',
      To: 'whatsapp:+14155238886',
      Body: '1 Paracetamol',
      NumMedia: '0'
    };

    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);

    // Wait a brief tick for setImmediate detachment to complete
    await new Promise((resolve) => setTimeout(resolve, 80));

    const sent = twilioService.getSentMessages();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const lastMsg = sent[sent.length - 1];
    expect(lastMsg.to).toBe('whatsapp:+919876543211');
    expect(lastMsg.body).toContain('Dolo 650');
  });

  test('5. Prescription photo webhook acknowledges immediately and detaches OCR', async () => {
    const payload = {
      From: 'whatsapp:+919876543212',
      To: 'whatsapp:+14155238886',
      NumMedia: '1',
      MediaUrl0: 'https://example.com/rx_sample.jpg',
      MediaContentType0: 'image/jpeg'
    };

    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);
    expect(res.rawBody).toContain('<Response></Response>');

    // Wait for background OCR dispatch
    await new Promise((resolve) => setTimeout(resolve, 80));

    const lastMsg = twilioService.getLastSentMessage();
    expect(lastMsg).toBeTruthy();
    expect(lastMsg.to).toBe('whatsapp:+919876543212');
    expect(lastMsg.body).toContain('Prescription Scanned');
    expect(lastMsg.body).toContain('Metformin');
  });

  test('6. Empty webhook payload does not crash server and returns 200', async () => {
    const res = await client.post('/api/whatsapp/webhook', '', {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);
    expect(res.rawBody).toContain('<Response></Response>');
  });

  test('7. JSON formatted webhook payload is accepted seamlessly', async () => {
    const payload = {
      From: 'whatsapp:+919876543210',
      Body: 'help'
    };

    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/json'
    });

    expect(res.status).toBe(200);
    expect(res.rawBody).toContain('<Response></Response>');
  });

  test('8. Oversized webhook body (>4096 chars) does not crash server', async () => {
    const largeBody = 'A'.repeat(5000);
    const payload = {
      From: 'whatsapp:+919876543210',
      Body: largeBody
    };

    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);
    expect(res.rawBody).toContain('<Response></Response>');
  });

  test('9. Invalid phone format is handled gracefully without exception', async () => {
    const payload = {
      From: 'invalid-non-e164',
      Body: 'Hi'
    };

    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    expect(res.status).toBe(200);
  });
});
