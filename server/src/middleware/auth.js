/**
 * Quick Sanjeevani - JWT Authentication Middleware
 * Validates Bearer tokens and attaches user identity to request object.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
      title: 'Unauthorized',
      status: 401,
      detail: 'Authorization Bearer token is required to access this resource.',
      instance: req.originalUrl || req.url,
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
      title: 'Unauthorized',
      status: 401,
      detail: isExpired
        ? 'Authentication token has expired. Please log in again.'
        : 'Invalid authentication token provided.',
      instance: req.originalUrl || req.url,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Role-based access control middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
        title: 'Forbidden',
        status: 403,
        detail: `Access forbidden. Required role: [${roles.join(', ')}].`,
        instance: req.originalUrl || req.url,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
};
