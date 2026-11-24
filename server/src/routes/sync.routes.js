/**
 * Quick Sanjeevani - WatermelonDB Delta Sync Protocol Endpoint
 * POST /api/sync
 * Bidirectional push-pull delta synchronization for offline-first clients.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { Medicine, Prescription, Reminder } = require('../models');
const logger = require('../config/logger');

// Cache seed medicines for client catalog initial sync
const seedFilePath = path.join(__dirname, '../seeds/medicines.seed.json');
let cachedMedicines = [];
try {
  if (fs.existsSync(seedFilePath)) {
    cachedMedicines = JSON.parse(fs.readFileSync(seedFilePath, 'utf8')).map((m, idx) => ({
      id: `seed_med_${idx + 1}`,
      ...m,
      inStock: (m.stock || 0) > 0,
    }));
  }
} catch (e) {
  // Ignored
}

// Resilient in-memory storage for reminders and sync changes when DB is disconnected
const inMemoryReminders = new Map();
const inMemoryPrescriptions = new Map();

/**
 * POST /api/sync
 * Body:
 *  - lastPulledAt: number (epoch ms) or null
 *  - changes: { prescriptions: { created, updated, deleted }, reminders: { created, updated, deleted } }
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { lastPulledAt, changes = {} } = req.body;
    const userId = req.user ? req.user.id : null;
    const isDbConnected = mongoose.connection.readyState === 1;
    const serverTimestamp = Date.now();

    // 1. Process Pushed Changes (Client -> Server)
    if (changes.prescriptions) {
      const { created = [], updated = [], deleted = [] } = changes.prescriptions;

      // Created
      for (const item of created) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(userId)) {
          try {
            await Prescription.create({
              userId,
              patientName: item.patientName || req.user.name,
              doctorName: item.doctorName,
              clinicName: item.clinicName,
              imageUrl: item.imageUrl,
              rawOcrText: item.rawOcrText,
              extractedMedicines: item.medicines || item.extractedMedicines || [],
              status: item.status || 'pending',
            });
          } catch (e) {
            logger.warn(`[Sync] Failed to persist pushed prescription to DB: ${e.message}`);
          }
        }
        inMemoryPrescriptions.set(item.id || new mongoose.Types.ObjectId().toString(), {
          ...item,
          userId,
          updatedAt: new Date(serverTimestamp),
        });
      }

      // Updated
      for (const item of updated) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(item.id)) {
          try {
            await Prescription.findByIdAndUpdate(item.id, { ...item, updatedAt: new Date() });
          } catch (e) {
            // Ignored
          }
        }
        if (inMemoryPrescriptions.has(item.id)) {
          inMemoryPrescriptions.set(item.id, {
            ...inMemoryPrescriptions.get(item.id),
            ...item,
            updatedAt: new Date(serverTimestamp),
          });
        }
      }

      // Deleted
      for (const id of deleted) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
          try {
            await Prescription.findByIdAndDelete(id);
          } catch (e) {
            // Ignored
          }
        }
        inMemoryPrescriptions.delete(id);
      }
    }

    if (changes.reminders) {
      const { created = [], updated = [], deleted = [] } = changes.reminders;

      for (const item of created) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(userId)) {
          try {
            await Reminder.create({
              userId,
              medicineName: item.medicineName,
              dosage: item.dosage,
              times: item.times || [],
              daysOfWeek: item.daysOfWeek || [],
              isActive: item.isActive !== undefined ? item.isActive : true,
              whatsappAlert: item.whatsappAlert !== undefined ? item.whatsappAlert : true,
            });
          } catch (e) {
            logger.warn(`[Sync] Failed to persist pushed reminder: ${e.message}`);
          }
        }
        inMemoryReminders.set(item.id || new mongoose.Types.ObjectId().toString(), {
          ...item,
          userId,
          updatedAt: new Date(serverTimestamp),
        });
      }

      for (const item of updated) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(item.id)) {
          try {
            await Reminder.findByIdAndUpdate(item.id, { ...item, updatedAt: new Date() });
          } catch (e) {
            // Ignored
          }
        }
        if (inMemoryReminders.has(item.id)) {
          inMemoryReminders.set(item.id, {
            ...inMemoryReminders.get(item.id),
            ...item,
            updatedAt: new Date(serverTimestamp),
          });
        }
      }

      for (const id of deleted) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
          try {
            await Reminder.findByIdAndDelete(id);
          } catch (e) {
            // Ignored
          }
        }
        inMemoryReminders.delete(id);
      }
    }

    // 2. Prepare Pulled Delta (Server -> Client)
    const responseChanges = {
      medicines: { created: [], updated: [], deleted: [] },
      prescriptions: { created: [], updated: [], deleted: [] },
      reminders: { created: [], updated: [], deleted: [] },
    };

    // If initial sync (lastPulledAt is null, undefined, or 0), deliver full medicine catalog
    if (!lastPulledAt || Number(lastPulledAt) === 0) {
      if (isDbConnected) {
        try {
          const dbMeds = await Medicine.find({}).lean();
          if (dbMeds && dbMeds.length > 0) {
            responseChanges.medicines.created = dbMeds.map((m) => ({
              id: m._id.toString(),
              name: m.name,
              genericName: m.genericName,
              category: m.category,
              strength: m.strength,
              dosageForm: m.dosageForm,
              price: m.price,
              stock: m.stock,
              requiresPrescription: m.requiresPrescription,
              instructions: m.instructions,
            }));
          }
        } catch (e) {
          // Ignored
        }
      }

      if (responseChanges.medicines.created.length === 0) {
        responseChanges.medicines.created = cachedMedicines;
      }
    } else {
      // Delta sync for medicines modified after lastPulledAt
      const lastPullDate = new Date(Number(lastPulledAt));
      if (isDbConnected) {
        try {
          const updatedMeds = await Medicine.find({ updatedAt: { $gt: lastPullDate } }).lean();
          responseChanges.medicines.updated = updatedMeds.map((m) => ({
            id: m._id.toString(),
            name: m.name,
            price: m.price,
            stock: m.stock,
          }));
        } catch (e) {
          // Ignored
        }
      }
    }

    // Pull prescriptions updated since lastPulledAt for this user
    if (userId && lastPulledAt && Number(lastPulledAt) > 0) {
      const lastPullDate = new Date(Number(lastPulledAt));
      if (isDbConnected && mongoose.Types.ObjectId.isValid(userId)) {
        try {
          const userPres = await Prescription.find({
            userId,
            updatedAt: { $gt: lastPullDate },
          }).lean();

          responseChanges.prescriptions.updated = userPres.map((p) => ({
            id: p._id.toString(),
            patientName: p.patientName,
            status: p.status,
            extractedMedicines: p.extractedMedicines,
          }));
        } catch (e) {
          // Ignored
        }
      }
    }

    return res.status(200).json({
      timestamp: serverTimestamp,
      changes: responseChanges,
    });
  })
);

module.exports = router;
