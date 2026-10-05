import { AppError } from "../utils/AppError.js";

// -----------------------------------------------------------------------------
// 404 handler — mount BEFORE errorHandler
// -----------------------------------------------------------------------------
export const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// -----------------------------------------------------------------------------
// Global error handler — must have 4 params for Express to recognise it
// -----------------------------------------------------------------------------
export const errorHandler = (err, _req, res, _next) => {
  let { statusCode = 500, message } = err;

  // Mongoose: bad ObjectId
  if (err.name === "CastError") {
    message    = `Invalid ID: ${err.value}`;
    statusCode = 400;
  }

  // Mongoose: duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message    = `Duplicate value for field: '${field}'. Please use another value.`;
    statusCode = 409;
  }

  // Mongoose: validation errors
  if (err.name === "ValidationError") {
    message    = Object.values(err.errors).map((e) => e.message).join(". ");
    statusCode = 422;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError")  { message = "Invalid token.";  statusCode = 401; }
  if (err.name === "TokenExpiredError")  { message = "Token expired.";  statusCode = 401; }

  const isDev = process.env.NODE_ENV === "development";

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};
