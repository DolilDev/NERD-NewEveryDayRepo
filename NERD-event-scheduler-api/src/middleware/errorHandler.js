const ApiError = require('../errors/ApiError');

/**
 * Catch-all for unmatched routes. Forwards a 404 ApiError to the error handler.
 */
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Centralized error handler. Must declare 4 args so Express treats it as
 * error-handling middleware. Produces a consistent JSON error envelope:
 *   { "error": { "message": "...", "details"?: [...] } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // express.json() raises a SyntaxError for malformed request bodies.
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res
      .status(400)
      .json({ error: { message: 'Malformed JSON in request body' } });
  }

  const statusCode = err.statusCode || err.status || 500;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const error = {
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  };
  if (err.details !== undefined) {
    error.details = err.details;
  }

  return res.status(statusCode).json({ error });
}

module.exports = { notFoundHandler, errorHandler };
