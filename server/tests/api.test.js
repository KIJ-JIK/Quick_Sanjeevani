/**
 * Quick Sanjeevani - Core REST API Test Suite
 * Validates Auth, Medicines, Pharmacies, Prescriptions, and Delta Sync endpoints.
 */

const request = require('supertest');
const app = require('../src/app');

describe('Quick Sanjeevani API Endpoint Suite', () => {
  let authToken = '';
  let elderAuthToken = '';
  let testUserId = '';
  let createdPrescriptionId = '';

  // 1. Authentication Endpoints
  describe('Authentication API (/api/auth)', () => {
    test('POST /api/auth/otp/send generates OTP successfully for valid Indian phone number', async () => {
      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.phone).toBe('+919876543210');
      expect(res.body.mockOtp).toBe('123456');
    });

    test('POST /api/auth/otp/send rejects missing phone number with RFC 7807 400', async () => {
      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Bad Request');
      expect(res.body.detail).toContain('Phone number is required');
      expect(res.body.status).toBe(400);
    });

    test('POST /api/auth/otp/verify rejects invalid OTP with RFC 7807 400', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '9876543210', otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Bad Request');
      expect(res.body.detail).toContain('Invalid OTP');
    });

    test('POST /api/auth/otp/verify issues JWT token on correct OTP (123456)', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({
          phone: '9876543210',
          otp: '123456',
          name: 'Ramesh Sharma',
          role: 'patient',
          preferredLanguage: 'hi',
          emergencyContact: {
            name: 'Suresh Sharma',
            phone: '+919876543211',
            relationship: 'Son',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone).toBe('+919876543210');
      expect(res.body.user.name).toBe('Ramesh Sharma');
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user.preferredLanguage).toBe('hi');

      authToken = res.body.token;
      testUserId = res.body.user.id;
    });

    test('POST /api/auth/otp/verify creates an elder user account with Kannada preference', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({
          phone: '9880011223',
          otp: '123456',
          name: 'Gowdamma',
          role: 'elder',
          preferredLanguage: 'kn',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('elder');
      expect(res.body.user.preferredLanguage).toBe('kn');
      elderAuthToken = res.body.token;
    });

    test('GET /api/auth/me returns current authenticated user details', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Ramesh Sharma');
    });

    test('GET /api/auth/me rejects unauthorized request with RFC 7807 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
      expect(res.body.status).toBe(401);
    });

    test('GET /api/auth/me rejects invalid token with RFC 7807 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });
  });

  // 2. Medicine Search Endpoints
  describe('Medicine Catalog & Search API (/api/medicines)', () => {
    test('GET /api/medicines/search returns paginated list of seed medicines', async () => {
      const res = await request(app).get('/api/medicines/search');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(50);
      expect(res.body.medicines.length).toBeLessThanOrEqual(20);
      expect(res.body.medicines[0]).toHaveProperty('name');
      expect(res.body.medicines[0]).toHaveProperty('genericName');
      expect(res.body.medicines[0]).toHaveProperty('category');
      expect(res.body.medicines[0]).toHaveProperty('inStock');
    });

    test('GET /api/medicines/search matches brand name and generic name via search query "q"', async () => {
      const res = await request(app).get('/api/medicines/search?q=Paracetamol');

      expect(res.status).toBe(200);
      expect(res.body.medicines.length).toBeGreaterThan(0);
      res.body.medicines.forEach((m) => {
        const matchesName = m.name.toLowerCase().includes('paracetamol');
        const matchesGeneric = m.genericName.toLowerCase().includes('paracetamol');
        expect(matchesName || matchesGeneric).toBe(true);
      });
    });

    test('GET /api/medicines/search filters by therapeutic category', async () => {
      const res = await request(app).get('/api/medicines/search?category=Analgesics');

      expect(res.status).toBe(200);
      expect(res.body.medicines.length).toBeGreaterThan(0);
      res.body.medicines.forEach((m) => {
        expect(m.category.toLowerCase()).toContain('analgesics');
      });
    });

    test('GET /api/medicines/categories returns all unique therapeutic classes', async () => {
      const res = await request(app).get('/api/medicines/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(8);
    });

    test('GET /api/medicines/:id retrieves medicine or returns 404 for unknown', async () => {
      const searchRes = await request(app).get('/api/medicines/search?limit=1');
      const medId = searchRes.body.medicines[0]._id;

      const res = await request(app).get(`/api/medicines/${medId}`);
      expect(res.status).toBe(200);
      expect(res.body.medicine._id).toBe(medId);

      const notFoundRes = await request(app).get('/api/medicines/unknown_medicine_id_999');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.title).toBe('Not Found');
    });
  });

  // 3. Pharmacy Geolocation Endpoints
  describe('Pharmacy Geolocation Discovery API (/api/pharmacies)', () => {
    test('GET /api/pharmacies/nearby returns Bengaluru pharmacies ordered by distance', async () => {
      // Yelahanka center coordinates [13.1007, 77.5963]
      const res = await request(app).get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963&radius=15000');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(res.body.pharmacies[0]).toHaveProperty('name');
      expect(res.body.pharmacies[0]).toHaveProperty('distanceMeters');
      expect(res.body.pharmacies[0]).toHaveProperty('distanceKm');

      // Verify sorted ascending by distance
      for (let i = 1; i < res.body.pharmacies.length; i++) {
        expect(res.body.pharmacies[i].distanceMeters).toBeGreaterThanOrEqual(
          res.body.pharmacies[i - 1].distanceMeters
        );
      }
    });

    test('GET /api/pharmacies/nearby filters pharmacies with specific medicine in stock', async () => {
      const res = await request(app).get(
        '/api/pharmacies/nearby?lat=13.1007&lng=77.5963&radius=25000&medicineName=Dolo%20650'
      );

      expect(res.status).toBe(200);
      expect(res.body.pharmacies.length).toBeGreaterThanOrEqual(1);
      res.body.pharmacies.forEach((pharmacy) => {
        const item = pharmacy.inventory.find((i) => i.medicineName.toLowerCase().includes('dolo'));
        expect(item).toBeDefined();
        expect(item.stock).toBeGreaterThan(0);
      });
    });

    test('GET /api/pharmacies/nearby rejects missing lat/lng coordinates with RFC 7807 400', async () => {
      const res = await request(app).get('/api/pharmacies/nearby');

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Bad Request');
      expect(res.body.detail).toContain('lat');
    });

    test('GET /api/pharmacies/nearby rejects out-of-bounds coordinates with RFC 7807 400', async () => {
      const res = await request(app).get('/api/pharmacies/nearby?lat=95&lng=77.59');

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Bad Request');
      expect(res.body.detail).toContain('Latitude must be a numeric value between -90 and 90');
    });

    test('GET /api/pharmacies/:id retrieves single pharmacy or returns 404', async () => {
      const nearbyRes = await request(app).get('/api/pharmacies/nearby?lat=13.1007&lng=77.5963');
      const pharmacyId = nearbyRes.body.pharmacies[0]._id;

      const res = await request(app).get(`/api/pharmacies/${pharmacyId}`);
      expect(res.status).toBe(200);
      expect(res.body.pharmacy._id).toBe(pharmacyId);

      const notFoundRes = await request(app).get('/api/pharmacies/invalid_id_999');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.title).toBe('Not Found');
    });
  });

  // 4. Prescription Management Endpoints
  describe('Prescription Management API (/api/prescriptions)', () => {
    test('POST /api/prescriptions creates a prescription with extracted medicines', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientName: 'Ramesh Sharma',
          doctorName: 'Dr. Anita Roy, MD',
          clinicName: 'Yelahanka Multi-Specialty Clinic',
          imageUrl: 'https://storage.googleapis.com/quicksanjeevani/rx_101.jpg',
          rawOcrText: 'Rx: Dolo 650 1-0-1 after food for 3 days; Glycomet 500mg 1-0-0',
          extractedMedicines: [
            {
              name: 'Dolo 650',
              strength: '650mg',
              dosage: '1 tablet',
              frequency: 'twice daily',
              duration: '3 days',
              confidence: 0.95,
            },
            {
              name: 'Glycomet 500mg',
              strength: '500mg',
              dosage: '1 tablet',
              frequency: 'once morning',
              duration: '30 days',
              confidence: 0.92,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.prescription).toHaveProperty('patientName', 'Ramesh Sharma');
      expect(res.body.prescription.extractedMedicines.length).toBe(2);
      expect(res.body.prescription.status).toBe('pending');

      createdPrescriptionId = res.body.prescription._id || res.body.prescription.id;
    });

    test('POST /api/prescriptions rejects unauthenticated user with RFC 7807 401', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .send({ patientName: 'Unauthorized Patient' });

      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });

    test('GET /api/prescriptions returns list of user prescriptions', async () => {
      const res = await request(app)
        .get('/api/prescriptions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.prescriptions.length).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/prescriptions/:id retrieves the created prescription', async () => {
      const res = await request(app)
        .get(`/api/prescriptions/${createdPrescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.prescription.patientName).toBe('Ramesh Sharma');
    });

    test('PATCH /api/prescriptions/:id/status updates prescription status to verified', async () => {
      const res = await request(app)
        .patch(`/api/prescriptions/${createdPrescriptionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'verified' });

      expect(res.status).toBe(200);
      expect(res.body.prescription.status).toBe('verified');
    });

    test('PATCH /api/prescriptions/:id/status rejects invalid status with RFC 7807 400', async () => {
      const res = await request(app)
        .patch(`/api/prescriptions/${createdPrescriptionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'not_a_valid_status' });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Bad Request');
      expect(res.body.detail).toContain('Invalid status');
    });
  });

  // 5. Delta Sync Endpoint
  describe('Delta Sync API (/api/sync)', () => {
    test('POST /api/sync performs initial pull (lastPulledAt: 0) and delivers medicine catalog', async () => {
      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lastPulledAt: 0,
          changes: {},
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('changes');
      expect(res.body.changes).toHaveProperty('medicines');
      expect(res.body.changes.medicines.created.length).toBeGreaterThanOrEqual(50);
      expect(res.body.changes).toHaveProperty('prescriptions');
      expect(res.body.changes).toHaveProperty('reminders');
    });

    test('POST /api/sync pushes client changes (prescriptions & reminders) and returns updated delta', async () => {
      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lastPulledAt: Date.now() - 60000,
          changes: {
            prescriptions: {
              created: [
                {
                  id: 'client-rx-001',
                  patientName: 'Ramesh Sharma',
                  doctorName: 'Dr. Kumar',
                  medicines: [{ name: 'Paracetamol', dosage: '500mg' }],
                  status: 'pending',
                },
              ],
              updated: [],
              deleted: [],
            },
            reminders: {
              created: [
                {
                  id: 'client-rem-001',
                  medicineName: 'Dolo 650',
                  dosage: '1 tablet',
                  times: ['08:00', '20:00'],
                  daysOfWeek: [1, 2, 3, 4, 5],
                  isActive: true,
                  whatsappAlert: true,
                },
              ],
              updated: [],
              deleted: [],
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.changes).toHaveProperty('medicines');
      expect(res.body.changes).toHaveProperty('prescriptions');
      expect(res.body.changes).toHaveProperty('reminders');
    });

    test('POST /api/sync rejects unauthenticated sync request with RFC 7807 401', async () => {
      const res = await request(app)
        .post('/api/sync')
        .send({ lastPulledAt: 0, changes: {} });

      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });
  });
});
