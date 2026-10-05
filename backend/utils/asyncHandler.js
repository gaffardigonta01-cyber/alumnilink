/**
 * asyncHandler — wraps async route handlers so you never need try/catch.
 * Any thrown error is automatically forwarded to Express next(err).
 *
 * Usage:
 *   export const myController = asyncHandler(async (req, res, next) => { ... });
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
