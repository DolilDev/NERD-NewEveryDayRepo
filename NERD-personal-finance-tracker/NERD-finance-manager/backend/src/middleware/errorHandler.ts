// Centralized error handling.
//
// `notFoundHandler` runs when no route matched; `errorHandler` is the final
// middleware and converts thrown errors into a user-friendly `{ error }` JSON
// body with the right status code.

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../errors.ts';

/** Catch-all for unmatched routes — returns a 404 JSON body. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

/** Final error handler. Must keep all four arguments so Express treats it as
 *  error-handling middleware. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Known, intentional API errors (validation 400s, missing-resource 404s, ...).
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Malformed JSON body — express.json() throws a SyntaxError with status 400.
  const maybeBodyError = err as { status?: number; type?: string };
  if (err instanceof SyntaxError && maybeBodyError.status === 400) {
    res.status(400).json({ error: 'Invalid JSON in request body.' });
    return;
  }

  // Anything else is unexpected: log it and fall back to a generic 500.
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
};
