/**
 * AppError — operational errors with an HTTP status code.
 * The global error handler checks `err.isOperational` to distinguish
 * expected errors (e.g. 404, 401) from unexpected bugs.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode    = statusCode;
    this.isOperational = true;        // flag for the global error handler
    Error.captureStackTrace(this, this.constructor);
  }
}
