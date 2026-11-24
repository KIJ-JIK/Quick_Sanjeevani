/**
 * Quick Sanjeevani - Medicine Search & Catalog Routes
 * GET /api/medicines/search
 * GET /api/medicines/categories
 * GET /api/medicines/:id
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const { Medicine } = require('../models');
const logger = require('../config/logger');

// Load seed medicines as cached dataset for high availability and offline resilience
const seedFilePath = path.join(__dirname, '../seeds/medicines.seed.json');
let cachedSeedMedicines = [];

try {
  if (fs.existsSync(seedFilePath)) {
    const raw = fs.readFileSync(seedFilePath, 'utf8');
    cachedSeedMedicines = JSON.parse(raw).map((item, idx) => ({
      _id: `seed_med_${idx + 1}`,
      ...item,
      inStock: (item.stock || 0) > 0,
    }));
  }
} catch (err) {
  logger.error(`[Medicine] Failed to load seed medicines into cache: ${err.message}`);
}

/**
 * GET /api/medicines/categories
 * Returns list of all available therapeutic categories
 */
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    let categories = [];
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        categories = await Medicine.distinct('category');
      } catch (err) {
        logger.warn(`[Medicine] DB distinct query failed: ${err.message}`);
      }
    }

    if (!categories || categories.length === 0) {
      categories = [...new Set(cachedSeedMedicines.map((m) => m.category))];
    }

    return res.status(200).json({
      success: true,
      categories,
    });
  })
);

/**
 * GET /api/medicines/search
 * Query parameters:
 *  - q: search term matching name or genericName
 *  - category: therapeutic category filter
 *  - page: page number (default: 1)
 *  - limit: items per page (default: 20)
 *  - inStockOnly: boolean filter for items with stock > 0
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const inStockOnly = req.query.inStockOnly === 'true';

    const isDbConnected = mongoose.connection.readyState === 1;
    let medicines = [];
    let total = 0;

    if (isDbConnected) {
      try {
        const filter = {};

        if (q) {
          const regex = new RegExp(q, 'i');
          filter.$or = [{ name: regex }, { genericName: regex }, { category: regex }];
        }

        if (category) {
          filter.category = new RegExp(category, 'i');
        }

        if (inStockOnly) {
          filter.stock = { $gt: 0 };
        }

        const count = await Medicine.countDocuments(filter);
        if (count > 0) {
          total = count;
          const docs = await Medicine.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

          medicines = docs.map((doc) => ({
            ...doc,
            inStock: (doc.stock || 0) > 0,
          }));
        }
      } catch (err) {
        logger.warn(`[Medicine] MongoDB search failed: ${err.message}. Falling back to memory cache.`);
      }
    }

    // High-availability fallback to in-memory seed dataset
    if (medicines.length === 0 && (!isDbConnected || total === 0)) {
      let filtered = cachedSeedMedicines;

      if (q) {
        const lowerQ = q.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.name.toLowerCase().includes(lowerQ) ||
            m.genericName.toLowerCase().includes(lowerQ) ||
            (m.category && m.category.toLowerCase().includes(lowerQ))
        );
      }

      if (category) {
        const lowerCat = category.toLowerCase();
        filtered = filtered.filter((m) => m.category && m.category.toLowerCase().includes(lowerCat));
      }

      if (inStockOnly) {
        filtered = filtered.filter((m) => (m.stock || 0) > 0);
      }

      total = filtered.length;
      const startIndex = (page - 1) * limit;
      medicines = filtered.slice(startIndex, startIndex + limit);
    }

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      medicines,
    });
  })
);

/**
 * GET /api/medicines/:id
 * Retrieve single medicine details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let medicine = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        medicine = await Medicine.findById(id).lean();
      } catch (err) {
        logger.warn(`[Medicine] Failed to find medicine ${id} in DB: ${err.message}`);
      }
    }

    if (!medicine) {
      medicine = cachedSeedMedicines.find(
        (m) => String(m._id) === String(id) || String(m.name).toLowerCase() === String(id).toLowerCase()
      );
    }

    if (!medicine) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Not Found',
        status: 404,
        detail: `Medicine with ID or name '${id}' was not found in catalog.`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      medicine: {
        ...medicine,
        inStock: (medicine.stock || 0) > 0,
      },
    });
  })
);

module.exports = router;
