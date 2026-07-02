// Lightweight typed error used to signal an HTTP status from anywhere in the
// request pipeline. The centralized error handler turns it into a JSON body.

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/** 400 — the client sent something invalid. */
export function badRequest(message: string): ApiError {
  return new ApiError(400, message);
}

/** 404 — the requested resource does not exist. */
export function notFound(message = 'Resource not found.'): ApiError {
  return new ApiError(404, message);
}
