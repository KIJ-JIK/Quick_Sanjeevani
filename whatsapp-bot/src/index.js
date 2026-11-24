/**
 * Quick Sanjeevani — WhatsApp Bot Microservice Entrypoint
 * Fast Webhook Acknowledgment Engine with Regional Multilingual Voice Integration.
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const webhookRoutes = require('./webhook');

const app = express();
const PORT = process.env.WHATSAPP_PORT || process.env.PORT || 5001;

// Body parsing middlewares supporting URL-encoded Twilio payloads and JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Static route serving generated ElevenLabs audio clips
const audioDir = path.join(__dirname, '../public/audio');
app.use('/audio', express.static(audioDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'quick-sanjeevani-whatsapp-bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Mount WhatsApp webhook routes
// Twilio and test suites may call /api/whatsapp/webhook or /webhook
app.use('/api/whatsapp', webhookRoutes);
app.use('/', webhookRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    path: req.originalUrl
  });
});

// Centralized error handler to prevent process crashes
app.use((err, req, res, next) => {
  console.error('[WhatsAppBot] Uncaught request error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      status: err.status || 500,
      error: err.message || 'Internal Server Error'
    });
  }
});

let server = null;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`[WhatsAppBot] Microservice running on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`[WhatsAppBot] Received ${signal}. Draining connections...`);
    if (server) {
      server.close(() => {
        console.log('[WhatsAppBot] HTTP server closed gracefully.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = app;
