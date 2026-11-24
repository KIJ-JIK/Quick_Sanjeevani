/**
 * Quick Sanjeevani — Standalone In-Memory Ephemeral Mock Server
 * Simulates Quick Sanjeevani Express API & WhatsApp Bot interface contracts.
 * Supports Windows Named Pipes (IPC) and standard TCP Sockets.
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadSeedData() {
  const rootDir = path.resolve(__dirname, '../../');
  const medsPath = path.join(rootDir, 'server/src/seeds/medicines.seed.json');
  const pharmsPath = path.join(rootDir, 'server/src/seeds/pharmacies.seed.json');

  let medicines = [];
  let pharmacies = [];

  try {
    if (fs.existsSync(medsPath)) {
      medicines = JSON.parse(fs.readFileSync(medsPath, 'utf8'));
    }
  } catch {
    medicines = [];
  }

  try {
    if (fs.existsSync(pharmsPath)) {
      pharmacies = JSON.parse(fs.readFileSync(pharmsPath, 'utf8'));
    }
  } catch {
    pharmacies = [];
  }

  // Baseline standard test items ensuring exact mapping
  const baselineMedicines = [
    {
      _id: 'med_01',
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      strength: '500mg',
      price: 25,
      stock: 100,
      schedule: 'OTC',
      requiresPrescription: false
    },
    {
      _id: 'med_02',
      name: 'Metformin 500mg',
      genericName: 'Metformin Hydrochloride',
      category: 'Antidiabetic',
      dosageForm: 'Tablet',
      strength: '500mg',
      price: 42,
      stock: 80,
      schedule: 'Schedule H',
      requiresPrescription: true
    },
    {
      _id: 'med_03',
      name: 'Amlodipine 5mg',
      genericName: 'Amlodipine Besylate',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '5mg',
      price: 45,
      stock: 60,
      schedule: 'Schedule H',
      requiresPrescription: true
    },
    {
      _id: 'med_04',
      name: 'Atorvastatin 10mg',
      genericName: 'Atorvastatin Calcium',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '10mg',
      price: 78,
      stock: 50,
      schedule: 'Schedule H',
      requiresPrescription: true
    },
    {
      _id: 'med_05',
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      category: 'Antibiotic',
      dosageForm: 'Tablet',
      strength: '500mg',
      price: 120,
      stock: 35,
      schedule: 'Schedule H1',
      requiresPrescription: true
    }
  ];

  // Merge seed data ensuring med_01..05 exist
  const mergedMedicines = [...baselineMedicines];
  medicines.forEach((m, idx) => {
    const id = m._id || `med_${String(idx + 10).padStart(2, '0')}`;
    mergedMedicines.push({ ...m, _id: id });
  });

  const baselinePharmacies = [
    {
      _id: 'ph_01',
      name: 'City Pharmacy Yelahanka',
      phone: '+919876543210',
      licenseNumber: 'KA-BLR-2024-001',
      rating: 4.8,
      address: {
        street: 'BB Road',
        area: 'Yelahanka',
        city: 'Bengaluru',
        pincode: '560064'
      },
      location: {
        type: 'Point',
        coordinates: [77.5963, 13.1007]
      },
      inventory: [
        { medicineName: 'Paracetamol 500mg', stock: 50, priceOverride: 25 },
        { medicineName: 'Metformin 500mg', stock: 40, priceOverride: 42 },
        { medicineName: 'Dolo 650', stock: 85, priceOverride: 34 }
      ],
      stockFreshnessTimestamp: new Date().toISOString()
    },
    {
      _id: 'ph_02',
      name: 'Sanjeevani MedPlus Indiranagar',
      phone: '+919876543211',
      licenseNumber: 'KA-BLR-2024-002',
      rating: 4.6,
      address: {
        street: '100 Feet Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      location: {
        type: 'Point',
        coordinates: [77.6412, 12.9719]
      },
      inventory: [
        { medicineName: 'Amlodipine 5mg', stock: 30, priceOverride: 45 },
        { medicineName: 'Crocin 500', stock: 60, priceOverride: 20 }
      ],
      stockFreshnessTimestamp: new Date().toISOString()
    }
  ];

  const mergedPharmacies = [...baselinePharmacies];
  pharmacies.forEach((p, idx) => {
    const id = p._id || `ph_${String(idx + 10).padStart(2, '0')}`;
    mergedPharmacies.push({ ...p, _id: id });
  });

  return { medicines: mergedMedicines, pharmacies: mergedPharmacies };
}

function createMockServer(options = {}) {
  return new Promise((resolve, reject) => {
    const { medicines, pharmacies } = loadSeedData();

    const state = {
      isDbConnected: true,
      circuitBreakerOpen: false,
      userPreferredLanguage: 'hi',
      emergencyContact: null,
      prescriptions: [
        {
          id: 'rx_seed_01',
          userId: 'u_elder_1',
          patientName: 'Rameshwaridevi',
          doctorName: 'Dr. Sharma',
          clinicName: 'Manipal Clinic',
          imageUrl: 'https://example.com/rx_sample.jpg',
          extractedMedicines: [
            { name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'twice daily', confidence: 0.95 }
          ],
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ],
      reminders: [
        {
          id: 'rem_1',
          userId: 'u_elder_1',
          medicineName: 'Metformin',
          dosage: '500mg',
          times: ['08:00', '20:00'],
          isActive: true
        }
      ],
      medicines,
      pharmacies,
      dispatchedWhatsAppMessages: []
    };

    const server = http.createServer((req, res) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Malformed URL' }));
      }

      const pathname = parsedUrl.pathname;
      const method = req.method.toUpperCase();

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let jsonBody = {};
        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          try {
            jsonBody = JSON.parse(body || '{}');
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/problem+json' });
            return res.end(JSON.stringify({
              type: 'about:blank',
              title: 'Bad Request',
              status: 400,
              detail: 'Malformed JSON payload'
            }));
          }
        }

        const sendJson = (status, data, extraHeaders = {}) => {
          res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
          res.end(JSON.stringify(data));
        };

        // 1. Health Endpoint
        if (pathname === '/health' && method === 'GET') {
          return sendJson(200, {
            status: state.isDbConnected ? 'healthy' : 'degraded',
            uptime: 1450.2,
            database: {
              status: state.isDbConnected ? 'connected' : 'disconnected',
              poolSize: 10
            },
            circuitBreakers: {
              externalServices: state.circuitBreakerOpen ? 'OPEN' : 'CLOSED'
            },
            timestamp: new Date().toISOString()
          });
        }

        // 2. Auth Endpoints
        if (pathname === '/api/auth/otp/send' && method === 'POST') {
          const phone = jsonBody.phone;
          if (!phone || typeof phone !== 'string' || !/^\+?[0-9]{10,13}$/.test(phone)) {
            return sendJson(400, { success: false, message: 'Invalid phone format' });
          }
          return sendJson(200, { success: true, message: 'OTP sent successfully', otp: '123456' });
        }

        if (pathname === '/api/auth/otp/verify' && method === 'POST') {
          const { phone, otp } = jsonBody;
          if (otp !== '123456') {
            return sendJson(400, { success: false, message: 'Invalid OTP' });
          }
          return sendJson(200, {
            success: true,
            token: 'mock_e2e_jwt_token_valid',
            user: {
              id: 'u_elder_1',
              phone: phone || '+919876543210',
              name: 'Rameshwaridevi',
              role: 'elder',
              preferredLanguage: state.userPreferredLanguage
            }
          });
        }

        if (pathname === '/api/auth/me' && method === 'GET') {
          const auth = req.headers['authorization'] || '';
          if (!auth.includes('mock_e2e_jwt_token_valid')) {
            return sendJson(401, { success: false, message: 'Unauthorized' });
          }
          return sendJson(200, {
            user: {
              id: 'u_elder_1',
              phone: '+919876543210',
              name: 'Rameshwaridevi',
              preferredLanguage: state.userPreferredLanguage,
              emergencyContact: state.emergencyContact
            }
          });
        }

        if (pathname === '/api/auth/profile' && method === 'PATCH') {
          if (jsonBody.preferredLanguage) {
            state.userPreferredLanguage = jsonBody.preferredLanguage;
          }
          if (jsonBody.emergencyContact) {
            state.emergencyContact = jsonBody.emergencyContact;
          }
          return sendJson(200, { success: true, updated: jsonBody });
        }

        // 3. Medicine Endpoints
        if (pathname === '/api/medicines/search' && method === 'GET') {
          const rawQ = parsedUrl.searchParams.get('q') || '';
          const cat = parsedUrl.searchParams.get('category');

          let filtered = state.medicines;

          if (rawQ) {
            const cleanQ = escapeRegex(rawQ.trim()).toLowerCase();
            filtered = filtered.filter(m => {
              const nameMatch = m.name && m.name.toLowerCase().includes(cleanQ);
              const genMatch = m.genericName && m.genericName.toLowerCase().includes(cleanQ);
              return nameMatch || genMatch;
            });
          }

          if (cat) {
            filtered = filtered.filter(m => {
              return m.category && m.category.toLowerCase().includes(cat.toLowerCase());
            });
          }

          return sendJson(200, {
            success: true,
            count: filtered.length,
            medicines: filtered,
            data: filtered
          });
        }

        if (pathname.startsWith('/api/medicines/') && method === 'GET') {
          const id = pathname.split('/')[3];
          const med = state.medicines.find(m => m._id === id);
          if (!med) {
            return sendJson(404, { message: 'Medicine not found' });
          }
          return sendJson(200, { success: true, medicine: med });
        }

        // 4. Pharmacy Endpoints
        if (pathname === '/api/pharmacies/nearby' && method === 'GET') {
          const latStr = parsedUrl.searchParams.get('lat');
          const lngStr = parsedUrl.searchParams.get('lng');

          if (!latStr || !lngStr) {
            return sendJson(400, { success: false, message: 'Coordinates required' });
          }

          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);

          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return sendJson(400, { success: false, message: 'Invalid coordinates' });
          }

          return sendJson(200, {
            success: true,
            count: state.pharmacies.length,
            pharmacies: state.pharmacies,
            data: state.pharmacies
          });
        }

        // 5. Prescription Endpoints
        if (pathname === '/api/prescriptions' && method === 'POST') {
          if (state.circuitBreakerOpen) {
            return sendJson(503, {
              success: false,
              message: 'OCR Service circuit breaker OPEN, manual review queued'
            });
          }

          let patientName = jsonBody.patientName || 'Rameshwaridevi';
          if (typeof patientName === 'string') {
            patientName = patientName.replace(/<[^>]*>/g, '');
          }

          const rx = {
            id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: jsonBody.userId || 'u_elder_1',
            patientName,
            doctorName: jsonBody.doctorName || 'Dr. Sharma',
            clinicName: jsonBody.clinicName || 'Clinic',
            imageUrl: jsonBody.imageUrl || null,
            extractedMedicines: jsonBody.extractedMedicines || [
              { name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'twice daily', confidence: 0.95 }
            ],
            status: 'pending',
            createdAt: new Date().toISOString()
          };
          state.prescriptions.push(rx);
          return sendJson(201, { success: true, prescription: rx });
        }

        if (pathname === '/api/prescriptions' && method === 'GET') {
          const auth = req.headers['authorization'];
          // Allow in mock if token present or default patient queries
          return sendJson(200, { success: true, prescriptions: state.prescriptions });
        }

        // 6. WatermelonDB Delta Sync Endpoint
        if (pathname === '/api/sync' && method === 'POST') {
          const { lastPulledAt, changes } = jsonBody;
          if (typeof lastPulledAt === 'undefined') {
            return sendJson(400, { message: 'lastPulledAt required' });
          }

          if (changes && changes.reminders && changes.reminders.created) {
            changes.reminders.created.forEach(rem => {
              state.reminders.push(rem);
            });
          }

          return sendJson(200, {
            timestamp: Date.now(),
            changes: {
              medicines: {
                created: lastPulledAt === 0 ? state.medicines : [],
                updated: [],
                deleted: []
              },
              prescriptions: { created: [], updated: [], deleted: [] },
              reminders: { created: state.reminders, updated: [], deleted: [] }
            }
          });
        }

        // 7. Orders Endpoints
        if (pathname === '/api/orders' && method === 'POST') {
          const { customerPhone, items = [] } = jsonBody;
          if (!customerPhone || items.length === 0) {
            return sendJson(400, { status: 400, detail: 'customerPhone and items required' });
          }
          const orderNumber = `QS-${Date.now().toString().slice(-6)}-101`;
          const totalAmount = items.reduce((acc, i) => acc + (i.unitPrice || i.price || 45) * (i.quantity || 1), 0);
          const order = {
            orderNumber,
            customerPhone,
            items,
            totalAmount,
            pharmacyName: 'City Chemist & Druggist (Yelahanka)',
            fulfillmentStatus: 'placed',
            payment: {
              status: 'link_generated',
              paymentUrl: `https://rzp.io/l/qs_${orderNumber.toLowerCase()}`
            }
          };
          return sendJson(201, { status: 'success', order, payment: order.payment });
        }

        if (pathname === '/api/orders' && method === 'GET') {
          return sendJson(200, {
            status: 'success',
            count: 2,
            orders: [
              {
                orderNumber: 'QS-89210-410',
                totalAmount: 135,
                fulfillmentStatus: 'out_for_delivery',
                pharmacyName: 'City Chemist (Yelahanka)'
              }
            ]
          });
        }

        if (pathname.startsWith('/api/orders/') && pathname.endsWith('/pay') && method === 'POST') {
          return sendJson(200, {
            status: 'success',
            order: {
              orderNumber: 'QS-89210-410',
              fulfillmentStatus: 'packing',
              payment: { status: 'paid', paidAt: new Date().toISOString() }
            }
          });
        }

        // 8. Company & Pharmacy Portal Endpoints
        if (pathname === '/api/company/dashboard' && method === 'GET') {
          return sendJson(200, {
            status: 'success',
            data: {
              totalOrders: 148,
              activeOrders: 12,
              prescriptionsPendingVerification: 5,
              totalPartnerPharmacies: 5,
              catalogMedicinesCount: state.medicines.length,
              grossMerchandiseValue: 18450
            }
          });
        }

        if (pathname === '/api/company/pharmacies' && method === 'GET') {
          return sendJson(200, {
            status: 'success',
            count: state.pharmacies.length,
            pharmacies: state.pharmacies
          });
        }

        if (pathname.includes('/api/company/prescriptions/') && pathname.endsWith('/verify') && method === 'PATCH') {
          return sendJson(200, {
            status: 'success',
            message: 'Prescription verified and approved for dispensing',
            verifiedBy: jsonBody.pharmacistName || 'Pharmacist Ramesh Kumar (Reg #KA-PH-49201)'
          });
        }

        if (pathname === '/api/company/inventory/sync' && method === 'POST') {
          return sendJson(200, {
            status: 'success',
            message: 'Successfully synchronized inventory',
            updatedCount: (jsonBody.items || []).length
          });
        }

        if (pathname === '/api/company/orders/queue' && method === 'GET') {
          return sendJson(200, {
            status: 'success',
            count: 1,
            queue: [
              {
                orderNumber: 'QS-892104-102',
                customerName: 'Smt. Shanta Devi',
                fulfillmentStatus: 'packing'
              }
            ]
          });
        }

        // 7. WhatsApp Webhook Endpoint
        if ((pathname === '/api/whatsapp/webhook' || pathname === '/webhook') && method === 'POST') {
          const startMs = Date.now();
          // Always return immediate HTTP 200 TwiML response (<50ms)
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end('<Response></Response>');

          let params;
          try {
            params = new URLSearchParams(body);
          } catch {
            params = new URLSearchParams();
          }

          const from = params.get('From') || '';
          const msgBody = (params.get('Body') || '').trim();
          const mediaUrl = params.get('MediaUrl0');

          state.dispatchedWhatsAppMessages.push({
            to: from,
            receivedText: msgBody,
            mediaUrl,
            timestamp: Date.now(),
            ackLatencyMs: Date.now() - startMs
          });
          return;
        }

        // Default 404
        sendJson(404, { message: `Route ${pathname} not found` });
      });
    });

    const useNamedPipe = options.socketPath
      ? true
      : (typeof options.useNamedPipe === 'boolean'
          ? options.useNamedPipe
          : (process.platform === 'win32' && !options.port));

    if (useNamedPipe) {
      const pipeName = options.socketPath || `\\\\.\\pipe\\qs_e2e_mock_${process.pid}_${Date.now()}`;
      server.listen(pipeName, () => {
        resolve({
          pipeName,
          port: null,
          server,
          state,
          setDbConnected: (val) => { state.isDbConnected = val; },
          setCircuitBreaker: (val) => { state.circuitBreakerOpen = val; },
          close: () => new Promise(r => server.close(r))
        });
      });
      server.on('error', reject);
    } else {
      const port = options.port || 0;
      server.listen(port, () => {
        const boundPort = server.address().port;
        resolve({
          pipeName: null,
          port: boundPort,
          server,
          state,
          setDbConnected: (val) => { state.isDbConnected = val; },
          setCircuitBreaker: (val) => { state.circuitBreakerOpen = val; },
          close: () => new Promise(r => server.close(r))
        });
      });
      server.on('error', reject);
    }
  });
}

module.exports = { createMockServer };
