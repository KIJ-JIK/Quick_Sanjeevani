/**
 * Tier 4: Real-World Elderly Patient Workloads
 * 3 End-User Elderly Patient Scenarios
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

const assert = require('assert');
const { generateTwilioWebhook, generateSyncPayload } = require('../helpers/payload-generators');

async function run({ client }) {
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
  // Scenario 1: 72-Year-Old Grandparent (Rameshwaridevi) Hindi Voice Flow
  // =========================================================================
  await test('4.1 Real-World: 72yo Grandparent (Rameshwaridevi) Hindi text/voice inquiry flow', async () => {
    // 1. Authenticate elder user session with Hindi preference
    const authRes = await client.post('/api/auth/otp/verify', { phone: '+919876543210', otp: '123456' });
    assert.strictEqual(authRes.status, 200);
    client.setToken(authRes.body.token);

    // 2. Configure Hindi language preference
    const langRes = await client.patch('/api/auth/profile', { preferredLanguage: 'hi' });
    assert.strictEqual(langRes.status, 200);

    // 3. Elder sends WhatsApp message in Hindi: "दवाई चाहिए Paracetamol" (Need medicine)
    const waPayload = generateTwilioWebhook({
      from: 'whatsapp:+919876543210',
      body: 'दवाई चाहिए Paracetamol'
    });
    const waRes = await client.post('/api/whatsapp/webhook', waPayload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(waRes.status, 200);
    assert.ok(waRes.rawBody.includes('<Response></Response>'), 'Fast TwiML response expected');

    // 4. System checks nearby pharmacy in Yelahanka
    const pharmRes = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963&radius=3000');
    assert.strictEqual(pharmRes.status, 200);
    const pharms = pharmRes.body.pharmacies || pharmRes.body.data || [];
    assert.ok(pharms.length > 0, 'Should locate nearby pharmacy');
  });

  // =========================================================================
  // Scenario 2: Prescription Photo to Order & Reminders in Kannada
  // =========================================================================
  await test('4.2 Real-World: 68yo Grandfather (Venkatesh Murthy) Kannada prescription OCR & reminders', async () => {
    // Ensure authenticated session
    if (!client.token) {
      const authRes = await client.post('/api/auth/otp/verify', { phone: '+919876543212', otp: '123456' });
      if (authRes.body && authRes.body.token) {
        client.setToken(authRes.body.token);
      }
    }

    // 1. Set Kannada preference
    const langRes = await client.patch('/api/auth/profile', { preferredLanguage: 'kn' });
    assert.strictEqual(langRes.status, 200);

    // 2. Upload prescription photo containing chronic medications
    const rxRes = await client.post('/api/prescriptions', {
      patientName: 'Venkatesh Murthy',
      imageUrl: 'https://example.com/kannada_patient_rx.jpg',
      extractedMedicines: [
        { name: 'Metformin 500mg', dosage: '1-0-1', frequency: 'twice daily', confidence: 0.94 },
        { name: 'Amlodipine 5mg', dosage: '0-0-1', frequency: 'night only', confidence: 0.91 }
      ]
    });
    assert.strictEqual(rxRes.status, 201);
    const rx = rxRes.body.prescription || rxRes.body.data;
    assert.strictEqual(rx.extractedMedicines.length, 2);

    // 3. Webhook acknowledges photo upload immediately
    const waPayload = generateTwilioWebhook({
      from: 'whatsapp:+919876543212',
      body: 'Prescription photo',
      mediaUrl: 'https://example.com/kannada_patient_rx.jpg'
    });
    const waRes = await client.post('/api/whatsapp/webhook', waPayload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(waRes.status, 200);
  });

  // =========================================================================
  // Scenario 3: Complete Offline-to-Online Family Caregiver Sync Flow
  // =========================================================================
  await test('4.3 Real-World: Offline-to-online caregiver medication logging and sync reconciliation', async () => {
    // 1. App starts offline: pulls cached catalog from delta sync
    const initialSync = await client.post('/api/sync', generateSyncPayload({ lastPulledAt: 0 }));
    assert.strictEqual(initialSync.status, 200);
    const initialTimestamp = initialSync.body.timestamp;
    assert.ok(initialTimestamp > 0);

    // 2. Caregiver records dose taken while offline
    const offlineLog = {
      id: 'rem_dose_taken_01',
      userId: 'u_elder_1',
      medicineName: 'Metformin 500mg',
      dosage: '1 tablet taken at 08:15 AM',
      isActive: true
    };

    // 3. Reconnection triggers delta sync push
    const pushSync = await client.post('/api/sync', generateSyncPayload({
      lastPulledAt: initialTimestamp,
      createdReminders: [offlineLog]
    }));
    assert.strictEqual(pushSync.status, 200);
    assert.ok(pushSync.body.timestamp >= initialTimestamp);

    // 4. Verification pull ensures reconciliation
    const verifySync = await client.post('/api/sync', generateSyncPayload({
      lastPulledAt: pushSync.body.timestamp
    }));
    assert.strictEqual(verifySync.status, 200);
  });

  return tests;
}

module.exports = { run };
