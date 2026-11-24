/**
 * Quick Sanjeevani - Layer 2 Crash Resilience: Centralized RFC 7807 Error Handler
 * Emits Problem Details for HTTP APIs (RFC 7807) for all caught exceptions.
 */

const logger = require('../config/logger');

const HTTP_STATUS_TITLES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/**
 * 404 Route Not Found Middleware (RFC 7807)
 */
function notFoundHandler(req, res, next) {
  const errorPayload = {
    type: 'https://tools.ietf.org/html/rfc7807#section-3.1',
    title: 'Not Found',
    status: 404,
    detail: `The requested endpoint ${req.method} ${req.originalUrl} was not found on this server.`,
    instance: req.originalUrl,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(errorPayload);
}

/**
 * Centralized Error-Handling Middleware (RFC 7807)
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let title = HTTP_STATUS_TITLES[status] || (status >= 500 ? 'Internal Server Error' : 'Request Error');
  let detail = err.message || 'An unexpected internal server error occurred.';
  let errors = undefined;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    status = 400;
    title = 'Bad Request';
    detail = 'Database validation failed for submitted data.';
    errors = Object.keys(err.errors || {}).map((field) => ({
      field,
      message: err.errors[field].message,
      value: err.errors[field].value,
    }));
  }

  // Handle Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    status = 400;
    title = 'Bad Request';
    detail = `Invalid value '${err.value}' provided for field '${err.path}'.`;
  }

  // Handle JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    title = 'Unauthorized';
    detail = 'Invalid authentication token provided.';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    title = 'Unauthorized';
    detail = 'Authentication token has expired. Please log in again.';
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400;
    title = 'Bad Request';
    detail = 'Malformed JSON in request body.';
  }

  // Log error with appropriate severity
  if (status >= 500) {
    logger.error(`[Error:Layer2] ${req.method} ${req.originalUrl} -> ${status} ${title}: ${detail}`, {
      stack: err.stack,
      body: req.body,
    });
  } else {
    logger.warn(`[ClientError:Layer2] ${req.method} ${req.originalUrl} -> ${status} ${title}: ${detail}`);
  }

  const problemDetails = {
    type: `https://tools.ietf.org/html/rfc7807#section-3.1`,
    title,
    status,
    detail,
    instance: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
  };

  if (errors && errors.length > 0) {
    problemDetails.errors = errors;
  }

  res.status(status).json(problemDetails);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
