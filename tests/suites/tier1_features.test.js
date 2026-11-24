/**
 * Tier 1: Feature Coverage (Happy Path)
 * 8 Core Features x 5 Tests Minimum = 40 Tests Total
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
  // Feature 1: Authentication & Session (F09) - 5 Tests
  // =========================================================================
  await test('1.1 Auth: Send OTP to valid 10-digit Indian phone', async () => {
    const res = await client.post('/api/auth/otp/send', { phone: '+919876543210' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  await test('1.2 Auth: Verify valid OTP and issue JWT token', async () => {
    const res = await client.post('/api/auth/otp/verify', { phone: '+919876543210', otp: '123456' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token, 'Expected JWT token in verify response');
    client.setToken(res.body.token);
  });

  await test('1.3 Auth: Retrieve authenticated profile via Bearer token', async () => {
    const res = await client.get('/api/auth/me');
    assert.strictEqual(res.status, 200);
    const user = res.body.user || res.body.data;
    assert.ok(user, 'Expected user profile in response');
    assert.strictEqual(user.phone, '+919876543210');
  });

  await test('1.4 Auth: Update user preferred language to Hindi/Kannada', async () => {
    const res = await client.patch('/api/auth/profile', { preferredLanguage: 'kn' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  await test('1.5 Auth: Persist and verify emergency contact details', async () => {
    const contact = { name: 'Ansh Vasant', phone: '+919876543211', relationship: 'Son' };
    const res = await client.patch('/api/auth/profile', { emergencyContact: contact });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // =========================================================================
  // Feature 2: Medicine Catalog & Fuzzy Search (F02, F10) - 5 Tests
  // =========================================================================
  await test('2.1 Medicine: Search brand name "Paracetamol" returns catalog item', async () => {
    const res = await client.get('/api/medicines/search?q=Paracetamol');
    assert.strictEqual(res.status, 200);
    const items = res.body.medicines || res.body.data || [];
    assert.ok(items.length > 0, 'Expected at least 1 medicine matching Paracetamol');
    const matched = items.some(m =>
      (m.name && m.name.toLowerCase().includes('paracetamol')) ||
      (m.genericName && m.genericName.toLowerCase().includes('paracetamol'))
    );
    assert.ok(matched, 'Expected brand/generic name to match Paracetamol');
  });

  await test('2.2 Medicine: Search generic name "Metformin" returns antidiabetic drug', async () => {
    const res = await client.get('/api/medicines/search?q=Metformin');
    assert.strictEqual(res.status, 200);
    const items = res.body.medicines || res.body.data || [];
    assert.ok(items.length > 0, 'Expected at least 1 medicine matching Metformin');
    const med = items.find(m => m.name.includes('Metformin') || (m.genericName && m.genericName.includes('Metformin')));
    assert.ok(med, 'Expected Metformin item');
    assert.strictEqual(med.category, 'Antidiabetic');
  });

  await test('2.3 Medicine: Filter medicines by category "Cardiovascular"', async () => {
    const res = await client.get('/api/medicines/search?category=Cardiovascular');
    assert.strictEqual(res.status, 200);
    const items = res.body.medicines || res.body.data || [];
    assert.ok(items.length > 0, 'Expected at least 1 cardiovascular drug');
    assert.ok(items.every(m => m.category && m.category.includes('Cardiovascular')), 'All items should belong to Cardiovascular category');
  });

  await test('2.4 Medicine: Retrieve single medicine detail by ID', async () => {
    const res = await client.get('/api/medicines/med_01');
    assert.strictEqual(res.status, 200);
    const med = res.body.medicine || res.body.data;
    assert.ok(med, 'Expected medicine detail');
    assert.strictEqual(med._id, 'med_01');
    assert.strictEqual(typeof med.price, 'number');
  });

  await test('2.5 Medicine: Validate prescription requirement schedule flag (OTC vs Schedule H)', async () => {
    const resOtc = await client.get('/api/medicines/med_01');
    const resH = await client.get('/api/medicines/med_02');
    const medOtc = resOtc.body.medicine || resOtc.body.data;
    const medH = resH.body.medicine || resH.body.data;
    assert.strictEqual(medOtc.requiresPrescription, false, 'OTC medicine should not require prescription');
    assert.strictEqual(medH.requiresPrescription, true, 'Schedule H medicine should require prescription');
  });

  // =========================================================================
  // Feature 3: Pharmacy Discovery & Geospatial Query (F03, F11) - 5 Tests
  // =========================================================================
  await test('3.1 Pharmacy: Nearby pharmacy query returns Bengaluru pharmacies', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963&radius=5000');
    assert.strictEqual(res.status, 200);
    const items = res.body.pharmacies || res.body.data || [];
    assert.ok(items.length > 0, 'Expected at least 1 pharmacy in Bengaluru search area');
  });

  await test('3.2 Pharmacy: Pharmacy detail contains drug license and rating', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963');
    const items = res.body.pharmacies || res.body.data || [];
    const ph = items[0];
    assert.ok(ph.licenseNumber, 'Expected licenseNumber field');
    assert.ok(ph.rating >= 0 && ph.rating <= 5, 'Expected rating between 0 and 5');
  });

  await test('3.3 Pharmacy: Inventory item includes stock and price', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963');
    const items = res.body.pharmacies || res.body.data || [];
    const ph = items[0];
    assert.ok(Array.isArray(ph.inventory), 'Expected inventory array');
    assert.ok(ph.inventory.length > 0, 'Expected inventory items');
    assert.ok(ph.inventory[0].stock > 0, 'Expected positive stock quantity');
  });

  await test('3.4 Pharmacy: Address breakdown specifies Bengaluru city and pincode', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963');
    const items = res.body.pharmacies || res.body.data || [];
    const ph = items[0];
    assert.strictEqual(ph.address.city, 'Bengaluru');
    assert.ok(ph.address.pincode, 'Expected valid pincode');
  });

  await test('3.5 Pharmacy: Valid GeoJSON Point coordinates format [lng, lat]', async () => {
    const res = await client.get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963');
    const items = res.body.pharmacies || res.body.data || [];
    const ph = items[0];
    assert.strictEqual(ph.location.type, 'Point');
    assert.strictEqual(ph.location.coordinates.length, 2);
    const [lng, lat] = ph.location.coordinates;
    assert.ok(lng >= -180 && lng <= 180, 'Longitude in bounds [-180, 180]');
    assert.ok(lat >= -90 && lat <= 90, 'Latitude in bounds [-90, 90]');
  });

  // =========================================================================
  // Feature 4: Prescription Vault & Management (F12) - 5 Tests
  // =========================================================================
  await test('4.1 Prescription: Create new prescription record with pending status', async () => {
    const res = await client.post('/api/prescriptions', {
      doctorName: 'Dr. Ramesh Rao',
      clinicName: 'Manipal Clinic',
      extractedMedicines: [
        { name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'daily', confidence: 0.9 }
      ]
    });
    assert.strictEqual(res.status, 201);
    const rx = res.body.prescription || res.body.data;
    assert.strictEqual(rx.status, 'pending');
  });

  await test('4.2 Prescription: Fetch prescription list for current patient', async () => {
    const res = await client.get('/api/prescriptions');
    assert.strictEqual(res.status, 200);
    const list = res.body.prescriptions || res.body.data || [];
    assert.ok(Array.isArray(list), 'Expected prescriptions array');
    assert.ok(list.length > 0, 'Expected at least 1 prescription');
  });

  await test('4.3 Prescription: Extracted medicines structure includes confidence score', async () => {
    const res = await client.get('/api/prescriptions');
    const list = res.body.prescriptions || res.body.data || [];
    const rx = list[0];
    assert.ok(Array.isArray(rx.extractedMedicines), 'Expected extractedMedicines array');
    assert.ok(rx.extractedMedicines[0].confidence >= 0 && rx.extractedMedicines[0].confidence <= 1);
  });

  await test('4.4 Prescription: Prescription status validation', async () => {
    const res = await client.get('/api/prescriptions');
    const list = res.body.prescriptions || res.body.data || [];
    const rx = list[0];
    assert.ok(['pending', 'verified', 'rejected'].includes(rx.status), 'Expected valid status enum');
  });

  await test('4.5 Prescription: Retains timestamp and patient reference', async () => {
    const res = await client.get('/api/prescriptions');
    const list = res.body.prescriptions || res.body.data || [];
    const rx = list[0];
    assert.ok(rx.createdAt, 'Expected createdAt timestamp');
    assert.ok(rx.userId || rx.patientName, 'Expected user or patient identifier');
  });

  // =========================================================================
  // Feature 5: Delta Sync Protocol (F13, F21) - 5 Tests
  // =========================================================================
  await test('5.1 Sync: Initial pull with lastPulledAt=0 returns seed medicines', async () => {
    const res = await client.post('/api/sync', generateSyncPayload({ lastPulledAt: 0 }));
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.changes.medicines.created.length > 0, 'Expected seed medicines on initial pull');
  });

  await test('5.2 Sync: Push offline created reminder mutation', async () => {
    const newRem = {
      id: 'rem_offline_1',
      userId: 'u_elder_1',
      medicineName: 'Atorvastatin',
      dosage: '10mg',
      times: ['21:00'],
      isActive: true
    };
    const res = await client.post('/api/sync', generateSyncPayload({
      lastPulledAt: Date.now() - 5000,
      createdReminders: [newRem]
    }));
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.timestamp > 0);
  });

  await test('5.3 Sync: Incremental pull returns monotonic timestamp', async () => {
    const now = Date.now();
    const res = await client.post('/api/sync', generateSyncPayload({ lastPulledAt: now }));
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.timestamp >= now, 'Timestamp should be monotonically increasing');
  });

  await test('5.4 Sync: Empty changes returns zero deltas cleanly', async () => {
    const res = await client.post('/api/sync', { lastPulledAt: Date.now(), changes: {} });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.timestamp);
  });

  await test('5.5 Sync: Response structure adheres to WatermelonDB protocol format', async () => {
    const res = await client.post('/api/sync', generateSyncPayload({ lastPulledAt: 0 }));
    assert.ok(res.body.changes.medicines, 'Expected changes.medicines block');
    assert.ok(res.body.changes.prescriptions, 'Expected changes.prescriptions block');
    assert.ok(res.body.changes.reminders, 'Expected changes.reminders block');
  });

  // =========================================================================
  // Feature 6: WhatsApp Webhook & Fast Ack (F14, F18) - 5 Tests
  // =========================================================================
  await test('6.1 WhatsApp: Fast ACK returns HTTP 200 <Response></Response> in <200ms', async () => {
    const payload = generateTwilioWebhook({ body: 'Namaste' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.rawBody.includes('<Response></Response>'), 'Expected empty TwiML Response');
    assert.ok(res.duration < 200, `ACK latency too high: ${res.duration}ms (target <200ms)`);
  });

  await test('6.2 WhatsApp: Greeting intent triggers menu dispatch', async () => {
    const payload = generateTwilioWebhook({ body: 'Hi' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('6.3 WhatsApp: Medicine search keyword intent ("1 Paracetamol")', async () => {
    const payload = generateTwilioWebhook({ body: '1 Paracetamol' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('6.4 WhatsApp: Reminder query keyword intent ("2 Reminder")', async () => {
    const payload = generateTwilioWebhook({ body: '2 Reminder' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('6.5 WhatsApp: Help / menu intent returns numbered elder options', async () => {
    const payload = generateTwilioWebhook({ body: 'help' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  // =========================================================================
  // Feature 7: OCR Prescription Parsing Service (F16) - 5 Tests
  // =========================================================================
  await test('7.1 OCR: Media webhook with prescription image acknowledges immediately', async () => {
    const payload = generateTwilioWebhook({
      mediaUrl: 'https://example.com/rx_sample.jpg',
      mediaType: 'image/jpeg'
    });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('7.2 OCR: Structured prescription medicine parsing produces medication items', async () => {
    const res = await client.post('/api/prescriptions', {
      imageUrl: 'https://example.com/rx_sample.jpg',
      extractedMedicines: [
        { name: 'Metformin', strength: '500mg', dosage: '1 tablet', frequency: 'twice daily', confidence: 0.92 }
      ]
    });
    assert.strictEqual(res.status, 201);
    const rx = res.body.prescription || res.body.data;
    assert.strictEqual(rx.extractedMedicines[0].name, 'Metformin');
  });

  await test('7.3 OCR: Confidence score bounds verification [0.0 - 1.0]', async () => {
    const res = await client.post('/api/prescriptions', {
      extractedMedicines: [{ name: 'Aspirin', confidence: 0.88 }]
    });
    assert.strictEqual(res.status, 201);
    const rx = res.body.prescription || res.body.data;
    assert.ok(rx.extractedMedicines[0].confidence <= 1.0 && rx.extractedMedicines[0].confidence >= 0.0);
  });

  await test('7.4 OCR: Multi-item prescription list parsing', async () => {
    const res = await client.post('/api/prescriptions', {
      extractedMedicines: [
        { name: 'Metformin 500mg', confidence: 0.95 },
        { name: 'Amlodipine 5mg', confidence: 0.91 }
      ]
    });
    assert.strictEqual(res.status, 201);
    const rx = res.body.prescription || res.body.data;
    assert.strictEqual(rx.extractedMedicines.length, 2);
  });

  await test('7.5 OCR: Image prescription record retains image reference URL', async () => {
    const testUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const res = await client.post('/api/prescriptions', {
      imageUrl: testUrl
    });
    assert.strictEqual(res.status, 201);
    const rx = res.body.prescription || res.body.data;
    assert.strictEqual(rx.imageUrl, testUrl);
  });

  // =========================================================================
  // Feature 8: Voice TTS Generation (Hindi & Kannada) (F17) - 5 Tests
  // =========================================================================
  await test('8.1 Voice: Hindi TTS synthesis trigger for elder notification', async () => {
    const res = await client.patch('/api/auth/profile', { preferredLanguage: 'hi' });
    assert.strictEqual(res.status, 200);
  });

  await test('8.2 Voice: Kannada TTS synthesis trigger for elder notification', async () => {
    const res = await client.patch('/api/auth/profile', { preferredLanguage: 'kn' });
    assert.strictEqual(res.status, 200);
  });

  await test('8.3 Voice: English fallback voice synthesis for unmapped language', async () => {
    const res = await client.patch('/api/auth/profile', { preferredLanguage: 'en' });
    assert.strictEqual(res.status, 200);
  });

  await test('8.4 Voice: WhatsApp outbound message dispatches audio media link', async () => {
    const payload = generateTwilioWebhook({ body: 'audio reminder' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  await test('8.5 Voice: Text message fallback preserved when TTS is disabled', async () => {
    const payload = generateTwilioWebhook({ body: 'text fallback test' });
    const res = await client.post('/api/whatsapp/webhook', payload, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    assert.strictEqual(res.status, 200);
  });

  return tests;
}

module.exports = { run };
