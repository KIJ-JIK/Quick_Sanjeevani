/**
 * Quick Sanjeevani - M1 Seed Datasets & Domain Models Unit Tests
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Medicine = require('../src/models/Medicine');
const Pharmacy = require('../src/models/Pharmacy');
const User = require('../src/models/User');
const Prescription = require('../src/models/Prescription');
const Reminder = require('../src/models/Reminder');

describe('Milestone M1: Domain Models & Seed Datasets', () => {
  const medicinesPath = path.join(__dirname, '../src/seeds/medicines.seed.json');
  const pharmaciesPath = path.join(__dirname, '../src/seeds/pharmacies.seed.json');

  let medicinesData = [];
  let pharmaciesData = [];

  beforeAll(() => {
    expect(fs.existsSync(medicinesPath)).toBe(true);
    expect(fs.existsSync(pharmaciesPath)).toBe(true);

    medicinesData = JSON.parse(fs.readFileSync(medicinesPath, 'utf8'));
    pharmaciesData = JSON.parse(fs.readFileSync(pharmaciesPath, 'utf8'));
  });

  describe('Medicine Seed Dataset', () => {
    it('should have at least 50 authentic Indian medicines', () => {
      expect(medicinesData.length).toBeGreaterThanOrEqual(50);
    });

    it('should cover at least 8 unique therapeutic categories', () => {
      const categories = new Set(medicinesData.map((m) => m.category));
      expect(categories.size).toBeGreaterThanOrEqual(8);
    });

    it('should pass Mongoose schema validation for all medicine entries', () => {
      const validSchedules = ['OTC', 'Schedule H', 'Schedule X', 'Schedule H1'];

      medicinesData.forEach((med, idx) => {
        expect(med.name).toBeTruthy();
        expect(med.genericName).toBeTruthy();
        expect(med.category).toBeTruthy();
        expect(typeof med.price).toBe('number');
        expect(med.price).toBeGreaterThanOrEqual(0);
        expect(validSchedules).toContain(med.schedule);

        const doc = new Medicine(med);
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      });
    });
  });

  describe('Pharmacy Seed Dataset', () => {
    it('should have at least 5 pharmacies centered in Yelahanka cluster', () => {
      expect(pharmaciesData.length).toBeGreaterThanOrEqual(5);
    });

    it('should have valid GeoJSON 2dsphere Point coordinates for all pharmacies', () => {
      pharmaciesData.forEach((pharmacy) => {
        expect(pharmacy.name).toBeTruthy();
        expect(pharmacy.phone).toBeTruthy();
        expect(pharmacy.licenseNumber).toBeTruthy();
        expect(pharmacy.location).toBeDefined();
        expect(pharmacy.location.type).toBe('Point');
        expect(Array.isArray(pharmacy.location.coordinates)).toBe(true);
        expect(pharmacy.location.coordinates.length).toBe(2);

        const [lng, lat] = pharmacy.location.coordinates;
        // Bengaluru / Yelahanka coordinates bounds: lng ~77.5-77.7, lat ~12.9-13.3
        expect(lng).toBeGreaterThan(77.0);
        expect(lng).toBeLessThan(78.0);
        expect(lat).toBeGreaterThan(12.8);
        expect(lat).toBeLessThan(13.4);

        const doc = new Pharmacy(pharmacy);
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      });
    });

    it('should contain inventory items with realistic details', () => {
      pharmaciesData.forEach((pharmacy) => {
        expect(Array.isArray(pharmacy.inventory)).toBe(true);
        expect(pharmacy.inventory.length).toBeGreaterThan(0);
        pharmacy.inventory.forEach((item) => {
          expect(item.medicineName).toBeTruthy();
          expect(item.stock).toBeGreaterThanOrEqual(0);
          expect(item.priceOverride).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('User, Prescription, and Reminder Models', () => {
    it('should validate a complete User model document', () => {
      const userDoc = new User({
        phone: '+919876543210',
        name: 'Ramachandra Rao',
        role: 'elder',
        preferredLanguage: 'kn',
        emergencyContact: {
          name: 'Suresh Rao',
          phone: '+919876543211',
          relationship: 'Son',
        },
        address: {
          street: '12, Gandhi Bazaar',
          area: 'Yelahanka',
          city: 'Bengaluru',
          pincode: '560064',
        },
        coordinates: {
          latitude: 13.1007,
          longitude: 77.5963,
        },
      });

      const err = userDoc.validateSync();
      expect(err).toBeUndefined();
      expect(userDoc.phone).toBe('+919876543210');
      expect(userDoc.role).toBe('elder');
      expect(userDoc.preferredLanguage).toBe('kn');
    });

    it('should validate a Prescription model document with extracted medicines', () => {
      const prescriptionDoc = new Prescription({
        userId: new mongoose.Types.ObjectId(),
        patientName: 'Ramachandra Rao',
        doctorName: 'Dr. Ramesh Kumar, MD',
        clinicName: 'Yelahanka Polyclinic',
        imageUrl: 'https://storage.googleapis.com/quicksanjeevani/rx_101.jpg',
        rawOcrText: 'Rx: Dolo 650 1 tab TDS pc, Metformin 500mg 1 tab BD pc',
        extractedMedicines: [
          {
            name: 'Dolo 650',
            strength: '650mg',
            dosage: '1 tablet',
            frequency: 'Thrice daily (TDS)',
            duration: '5 days',
            confidence: 0.95,
          },
          {
            name: 'Metformin 500mg',
            strength: '500mg',
            dosage: '1 tablet',
            frequency: 'Twice daily (BD)',
            duration: '30 days',
            confidence: 0.92,
          },
        ],
        status: 'verified',
      });

      const err = prescriptionDoc.validateSync();
      expect(err).toBeUndefined();
      expect(prescriptionDoc.extractedMedicines.length).toBe(2);
      expect(prescriptionDoc.status).toBe('verified');
    });

    it('should validate a Reminder model document', () => {
      const reminderDoc = new Reminder({
        userId: new mongoose.Types.ObjectId(),
        medicineName: 'Metformin 500mg',
        dosage: '1 tablet with dinner',
        times: ['08:30', '20:30'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        isActive: true,
        whatsappAlert: true,
      });

      const err = reminderDoc.validateSync();
      expect(err).toBeUndefined();
      expect(reminderDoc.times).toEqual(['08:30', '20:30']);
      expect(reminderDoc.isActive).toBe(true);
      expect(reminderDoc.whatsappAlert).toBe(true);
    });
  });
});
