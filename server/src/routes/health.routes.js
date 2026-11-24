/**
 * Quick Sanjeevani - Health & System Status Endpoint
 * GET /health
 */

const express = require('express');
const router = express.Router();
const { getConnectionStatus } = require('../config/db');
const { getCircuitBreakerStatus } = require('../middleware/circuitBreaker');

router.get('/', (req, res) => {
  const dbStatus = getConnectionStatus();
  const circuitBreakers = getCircuitBreakerStatus();
  const mem = process.memoryUsage();

  const isHealthy = dbStatus.status === 'connected';

  const healthPayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: Number(process.uptime().toFixed(2)),
    memory: {
      heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
      rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
    },
    database: {
      status: dbStatus.status,
      poolSize: dbStatus.poolSize,
      reconnectAttempts: dbStatus.reconnectAttempts,
    },
    circuitBreakers,
    timestamp: new Date().toISOString(),
  };

  // Always returns HTTP 200 for liveness monitoring, with explicit health status
  return res.status(200).json(healthPayload);
});

module.exports = router;
