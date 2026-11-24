/**
 * Quick Sanjeevani - Prescription Management Routes
 * POST /api/prescriptions
 * GET /api/prescriptions
 * GET /api/prescriptions/:id
 * PATCH /api/prescriptions/:id/status
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { Prescription } = require('../models');
const logger = require('../config/logger');

// Resilient in-memory storage for offline / disconnected DB state
const inMemoryPrescriptions = new Map();

/**
 * POST /api/prescriptions
 * Upload / create a new prescription
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { patientName, doctorName, clinicName, imageUrl, rawOcrText, extractedMedicines } = req.body;
    const userId = req.user ? req.user.id : null;

    let prescription = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        const presDoc = new Prescription({
          userId: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
          patientName: patientName || req.user.name || 'Anonymous Patient',
          doctorName: doctorName || 'Consulting Physician',
          clinicName: clinicName || 'Health Center',
          imageUrl: imageUrl || '',
          rawOcrText: rawOcrText || '',
          extractedMedicines: Array.isArray(extractedMedicines) ? extractedMedicines : [],
          status: 'pending',
        });
        prescription = await presDoc.save();
      } catch (err) {
        logger.warn(`[Prescription] Failed to save in MongoDB: ${err.message}. Saving in memory.`);
      }
    }

    // High availability fallback: store in memory
    if (!prescription) {
      const syntheticId = new mongoose.Types.ObjectId().toString();
      prescription = {
        _id: syntheticId,
        id: syntheticId,
        userId,
        patientName: patientName || (req.user && req.user.name) || 'Anonymous Patient',
        doctorName: doctorName || 'Consulting Physician',
        clinicName: clinicName || 'Health Center',
        imageUrl: imageUrl || '',
        rawOcrText: rawOcrText || '',
        extractedMedicines: Array.isArray(extractedMedicines) ? extractedMedicines : [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryPrescriptions.set(syntheticId, prescription);
    }

    return res.status(201).json({
      success: true,
      prescription,
    });
  })
);

/**
 * GET /api/prescriptions
 * Retrieve prescriptions for authenticated user
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user ? req.user.id : null;
    let prescriptions = [];
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected && userId && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        prescriptions = await Prescription.find({ userId }).sort({ createdAt: -1 }).lean();
      } catch (err) {
        logger.warn(`[Prescription] Failed to query DB: ${err.message}`);
      }
    }

    if (prescriptions.length === 0) {
      // Collect from in-memory fallback
      prescriptions = Array.from(inMemoryPrescriptions.values()).filter(
        (p) => !userId || String(p.userId) === String(userId)
      );
    }

    return res.status(200).json({
      success: true,
      count: prescriptions.length,
      prescriptions,
    });
  })
);

/**
 * GET /api/prescriptions/:id
 * Retrieve a specific prescription
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let prescription = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        prescription = await Prescription.findById(id).lean();
      } catch (err) {
        logger.warn(`[Prescription] DB findById error: ${err.message}`);
      }
    }

    if (!prescription) {
      prescription = inMemoryPrescriptions.get(id);
    }

    if (!prescription) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Not Found',
        status: 404,
        detail: `Prescription with ID '${id}' was not found.`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      prescription,
    });
  })
);

/**
 * PATCH /api/prescriptions/:id/status
 * Update verification status of prescription
 */
router.patch(
  '/:id/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'verified', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid status '${status}'. Must be one of: [${validStatuses.join(', ')}].`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    let updated = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        updated = await Prescription.findByIdAndUpdate(
          id,
          {
            status,
            verifiedBy: req.user && mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : undefined,
            updatedAt: new Date(),
          },
          { new: true }
        ).lean();
      } catch (err) {
        logger.warn(`[Prescription] DB update failed: ${err.message}`);
      }
    }

    if (!updated && inMemoryPrescriptions.has(id)) {
      const pres = inMemoryPrescriptions.get(id);
      pres.status = status;
      pres.updatedAt = new Date();
      updated = pres;
      inMemoryPrescriptions.set(id, pres);
    }

    if (!updated) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Not Found',
        status: 404,
        detail: `Prescription with ID '${id}' was not found.`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      prescription: updated,
    });
  })
);

module.exports = router;
