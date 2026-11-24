/**
 * Quick Sanjeevani - Authentication Routes
 * Mock OTP generation, OTP verification, and JWT issuance
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../config/logger');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { User } = require('../models');

// In-memory fallback user cache for offline / disconnected DB resilience
const inMemoryUsers = new Map();

/**
 * Normalizes phone number format
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * POST /api/auth/otp/send
 * Initiates mock OTP delivery
 */
router.post(
  '/otp/send',
  asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone || String(phone).trim() === '') {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Phone number is required to send OTP.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    const formattedPhone = normalizePhone(phone);
    if (formattedPhone.length < 10) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid phone number format. Please provide a valid 10-digit number.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`[Auth] OTP generated for ${formattedPhone}: ${env.MOCK_OTP}`);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${formattedPhone}`,
      phone: formattedPhone,
      // For developer/hackathon testing convenience
      mockOtp: env.MOCK_OTP,
    });
  })
);

/**
 * POST /api/auth/otp/verify
 * Validates OTP and issues JWT authentication token
 */
router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const { phone, otp, name, role, preferredLanguage, emergencyContact, address, coordinates } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Both phone and otp are required fields.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    const formattedPhone = normalizePhone(phone);

    // Validate OTP against mock OTP
    if (String(otp).trim() !== String(env.MOCK_OTP).trim()) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid OTP. Please enter the correct 6-digit verification code.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    let user = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        user = await User.findOne({ phone: formattedPhone });
        if (!user) {
          user = await User.create({
            phone: formattedPhone,
            name: name || 'Quick Sanjeevani Patient',
            role: role || 'patient',
            preferredLanguage: preferredLanguage || 'en',
            emergencyContact: emergencyContact || undefined,
            address: address || undefined,
            coordinates: coordinates || undefined,
          });
          logger.info(`[Auth] Created new user in MongoDB: ${formattedPhone} (${user.role})`);
        }
      } catch (err) {
        logger.warn(`[Auth] MongoDB query failed during verify, falling back to memory: ${err.message}`);
      }
    }

    // In-memory fallback if DB not available or failed
    if (!user) {
      if (inMemoryUsers.has(formattedPhone)) {
        user = inMemoryUsers.get(formattedPhone);
      } else {
        user = {
          _id: new mongoose.Types.ObjectId(),
          phone: formattedPhone,
          name: name || 'Quick Sanjeevani Patient',
          role: role || 'patient',
          preferredLanguage: preferredLanguage || 'en',
          emergencyContact: emergencyContact || { name: 'Emergency Support', phone: '+919999999999' },
          address: address || { city: 'Bengaluru' },
          coordinates: coordinates || { latitude: 13.1007, longitude: 77.5963 },
          createdAt: new Date(),
        };
        inMemoryUsers.set(formattedPhone, user);
        logger.info(`[Auth] Created resilient user in memory: ${formattedPhone}`);
      }
    }

    const userId = user._id ? user._id.toString() : user.id;

    // Issue JWT
    const token = jwt.sign(
      {
        id: userId,
        phone: user.phone,
        role: user.role,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: userId,
        phone: user.phone,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        emergencyContact: user.emergencyContact,
      },
    });
  })
);

/**
 * GET /api/auth/me
 * Protected endpoint returning current user profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    let user = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        user = await User.findById(req.user.id).select('-__v');
      } catch (err) {
        logger.warn(`[Auth] Failed to load user from DB: ${err.message}`);
      }
    }

    if (!user && inMemoryUsers.has(req.user.phone)) {
      user = inMemoryUsers.get(req.user.phone);
    }

    if (!user) {
      user = req.user;
    }

    return res.status(200).json({
      success: true,
      user,
    });
  })
);

module.exports = router;
