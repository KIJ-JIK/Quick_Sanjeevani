/**
 * Quick Sanjeevani - Express Application Definition
 * Monorepo modular REST API with 4-Layer Crash Resilience
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route Handlers
const healthRouter = require('./routes/health.routes');
const authRouter = require('./routes/auth.routes');
const medicineRouter = require('./routes/medicine.routes');
const pharmacyRouter = require('./routes/pharmacy.routes');
const prescriptionRouter = require('./routes/prescription.routes');
const syncRouter = require('./routes/sync.routes');
const orderRouter = require('./routes/order.routes');
const companyRouter = require('./routes/company.routes');

const app = express();

// Security & Parsing Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Mount Core Application Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/medicines', medicineRouter);
app.use('/api/pharmacies', pharmacyRouter);
app.use('/api/prescriptions', prescriptionRouter);
app.use('/api/sync', syncRouter);
app.use('/api/orders', orderRouter);
app.use('/api/company', companyRouter);

// 404 Route Not Found Handler (RFC 7807)
app.use(notFoundHandler);

// Centralized Asynchronous Error Handler (Layer 2 Crash Resilience, RFC 7807)
app.use(errorHandler);

module.exports = app;
