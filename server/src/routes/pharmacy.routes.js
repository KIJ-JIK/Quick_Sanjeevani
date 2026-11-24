/**
 * Quick Sanjeevani - Pharmacy Discovery & Geolocation Routes
 * GET /api/pharmacies/nearby?lat=&lng=&radius=
 * GET /api/pharmacies/:id
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const { Pharmacy } = require('../models');
const logger = require('../config/logger');

// Load seed pharmacies into cache for offline / fallback resilience
const seedFilePath = path.join(__dirname, '../seeds/pharmacies.seed.json');
let cachedSeedPharmacies = [];

try {
  if (fs.existsSync(seedFilePath)) {
    const raw = fs.readFileSync(seedFilePath, 'utf8');
    cachedSeedPharmacies = JSON.parse(raw).map((item, idx) => ({
      _id: `seed_pharm_${idx + 1}`,
      ...item,
    }));
  }
} catch (err) {
  logger.error(`[Pharmacy] Failed to load seed pharmacies: ${err.message}`);
}

/**
 * Calculates Great-Circle Distance (Haversine formula) in meters
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * GET /api/pharmacies/nearby
 * Parameters:
 *  - lat: latitude (-90 to 90)
 *  - lng: longitude (-180 to 180)
 *  - radius: search radius in meters (default: 5000)
 *  - medicineName: optional filter for pharmacies with specified medicine in stock
 */
router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.query;
    const radius = parseFloat(req.query.radius) || 5000;
    const medicineName = (req.query.medicineName || '').trim().toLowerCase();

    // Validate coordinates
    if (lat === undefined || lng === undefined || lat === '' || lng === '') {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Both lat (latitude) and lng (longitude) query parameters are required.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid latitude '${lat}'. Latitude must be a numeric value between -90 and 90.`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid longitude '${lng}'. Longitude must be a numeric value between -180 and 180.`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    let nearbyPharmacies = [];

    if (isDbConnected) {
      try {
        const query = {
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: radius,
            },
          },
        };

        if (medicineName) {
          query['inventory.medicineName'] = new RegExp(medicineName, 'i');
          query['inventory.stock'] = { $gt: 0 };
        }

        const docs = await Pharmacy.find(query).lean();

        nearbyPharmacies = docs.map((pharmacy) => {
          const [pLng, pLat] = pharmacy.location.coordinates;
          const distanceMeters = haversineDistanceMeters(latitude, longitude, pLat, pLng);
          return {
            ...pharmacy,
            distanceMeters,
            distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          };
        });
      } catch (err) {
        logger.warn(`[Pharmacy] MongoDB $near query failed: ${err.message}. Falling back to memory calculation.`);
      }
    }

    // High availability fallback: compute Haversine against cached seed pharmacies
    if (nearbyPharmacies.length === 0) {
      nearbyPharmacies = cachedSeedPharmacies
        .map((pharmacy) => {
          const [pLng, pLat] = pharmacy.location.coordinates;
          const distanceMeters = haversineDistanceMeters(latitude, longitude, pLat, pLng);
          return {
            ...pharmacy,
            distanceMeters,
            distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          };
        })
        .filter((pharmacy) => {
          if (pharmacy.distanceMeters > radius) return false;
          if (medicineName) {
            const hasStock = (pharmacy.inventory || []).some(
              (item) => item.medicineName.toLowerCase().includes(medicineName) && (item.stock || 0) > 0
            );
            return hasStock;
          }
          return true;
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    return res.status(200).json({
      success: true,
      count: nearbyPharmacies.length,
      userLocation: { latitude, longitude },
      searchRadiusMeters: radius,
      pharmacies: nearbyPharmacies,
    });
  })
);

/**
 * GET /api/pharmacies/:id
 * Retrieve pharmacy details and live stock inventory
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let pharmacy = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        pharmacy = await Pharmacy.findById(id).lean();
      } catch (err) {
        logger.warn(`[Pharmacy] FindById failed: ${err.message}`);
      }
    }

    if (!pharmacy) {
      pharmacy = cachedSeedPharmacies.find(
        (p) => String(p._id) === String(id) || String(p.licenseNumber).toLowerCase() === String(id).toLowerCase()
      );
    }

    if (!pharmacy) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Not Found',
        status: 404,
        detail: `Pharmacy with ID '${id}' was not found.`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      pharmacy,
    });
  })
);

module.exports = router;
