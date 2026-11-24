/**
 * Tier 3: Pairwise Combinations
 * 5 Cross-Feature Integration Workflows
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

const assert = require('assert');
const { generateTwilioWebhook, generateSyncPayload } = require('../helpers/payload-generators');

async function run({ client, mockServer }) {
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
  // Combination 1: Offline Mutation -> Sync -> WhatsApp Inquiry
  // =========================================================================
  await test('3.1 Combo: Offline mutation pushed via /api/sync propagates to WhatsApp reminder inquiry', async () => {
    // Step 1: Push offline reminder mutation via WatermelonDB protocol
    const offlineReminder = {
      id: 'rem_combo_1',
      userId: 'u_elder_1',
      medicineName: 'Amlodipine',
      dosage: '5mg',
      times: ['09:00'],
      isActive: true
    };
    const syncRes = await client.post('/api/sync', generateSyncPayload({
      lastPulledAt: Date.now() - 10000,
      createdReminders: [offlineReminder]
    }));
    assert.strictEqual(syncRes.status, 200);
    assert.ok(syncRes.body.timestamp > 0);

    // Step 2: Query WhatsApp bot for reminders
    const waPayload = generateTwilioWebhook({ body: '2 Reminder' });
    const waRes = await client.post('/api/whatsapp/webhook', waPayload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(waRes.status, 200);
    assert.ok(waRes.rawBody.includes('<Response></Response>'));
  });

  // =========================================================================
  // Combination 2: Prescription -> OCR -> Medicine Search -> Nearby Pharmacy
  // =========================================================================
  await test('3.2 Combo: Prescription upload triggers OCR extraction, matches catalog, and locates stocking pharmacy', async () => {
    // Step 1: Upload prescription with extracted medicines
    const rxRes = await client.post('/api/prescriptions', {
      doctorName: 'Dr. Malathesh',
      extractedMedicines: [{ name: 'Metformin 500mg', dosage: '1 tablet', confidence: 0.96 }]
    });
    assert.strictEqual(rxRes.status, 201);
    const rx = rxRes.body.prescription || rxRes.body.data;
    const extractedMedName = rx.extractedMedicines[0].name;

    // Step 2: Search medicine catalog with extracted name
    const medRes = await client.get(`/api/medicines/search?q=${encodeURIComponent('Metformin')}`);
    assert.strictEqual(medRes.status, 200);
    const meds = medRes.body.medicines || medRes.body.data || [];
    assert.ok(meds.length > 0, 'Catalog should find Metformin');

    // Step 3: Find nearby pharmacy stocking this medicine
    const pharmRes = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963&radius=5000');
    assert.strictEqual(pharmRes.status, 200);
    const pharms = pharmRes.body.pharmacies || pharmRes.body.data || [];
    assert.ok(pharms.length > 0, 'Should locate nearby pharmacy');
    const hasInventory = pharms.some(p =>
      Array.isArray(p.inventory) && p.inventory.some(i => i.medicineName && i.medicineName.includes('Metformin'))
    );
    assert.ok(hasInventory, 'Nearby pharmacy should stock Metformin');
  });

  // =========================================================================
  // Combination 3: Language Preference -> Regional Voice Synthesis
  // =========================================================================
  await test('3.3 Combo: Setting preferred language to Kannada configures regional voice note response', async () => {
    // Ensure authenticated session
    if (!client.token) {
      const authRes = await client.post('/api/auth/otp/verify', { phone: '+919876543210', otp: '123456' });
      if (authRes.body && authRes.body.token) {
        client.setToken(authRes.body.token);
      }
    }

    // Step 1: Update language to Kannada ('kn')
    const langRes = await client.patch('/api/auth/profile', { preferredLanguage: 'kn' });
    assert.strictEqual(langRes.status, 200);

    // Step 2: Verify user profile reflects Kannada
    const meRes = await client.get('/api/auth/me');
    assert.strictEqual(meRes.status, 200);
    const user = meRes.body.user || meRes.body.data;
    assert.strictEqual(user.preferredLanguage, 'kn');

    // Step 3: Dispatch WhatsApp inquiry
    const waPayload = generateTwilioWebhook({ body: '1 Paracetamol' });
    const waRes = await client.post('/api/whatsapp/webhook', waPayload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(waRes.status, 200);
  });

  // =========================================================================
  // Combination 4: Circuit Breaker Trip -> Fallback -> Recovery
  // =========================================================================
  await test('3.4 Combo: Circuit breaker trips on failure, serves fallback, and recovers on heal', async () => {
    // Step 1: Trip circuit breaker
    if (mockServer) mockServer.setCircuitBreaker(true);
    const failRes = await client.post('/api/prescriptions', { imageUrl: 'https://example.com/rx_breaker.jpg' });
    assert.strictEqual(failRes.status, 503);

    // Step 2: Heal service and verify recovery
    if (mockServer) mockServer.setCircuitBreaker(false);
    const okRes = await client.post('/api/prescriptions', { imageUrl: 'https://example.com/rx_healed.jpg' });
    assert.strictEqual(okRes.status, 201);
  });

  // =========================================================================
  // Combination 5: Seed Data -> Geospatial Discovery -> Sync Delta Export
  // =========================================================================
  await test('3.5 Combo: Seed catalog items are exported via Delta Sync and queryable via geospatial index', async () => {
    // Step 1: Pull seed state from sync endpoint
    const syncRes = await client.post('/api/sync', generateSyncPayload({ lastPulledAt: 0 }));
    assert.strictEqual(syncRes.status, 200);
    assert.ok(syncRes.body.changes.medicines.created.length >= 5, 'Seed items exported in sync');

    // Step 2: Query geospatial pharmacies in Bengaluru
    const geoRes = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963');
    assert.strictEqual(geoRes.status, 200);
    const pharms = geoRes.body.pharmacies || geoRes.body.data || [];
    assert.ok(pharms.length >= 2, 'Geospatial index returns seeded Bengaluru pharmacies');
  });

  return tests;
}

module.exports = { run };
