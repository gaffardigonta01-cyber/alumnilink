import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const protect = asyncHandler(async (req, _res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  const user = await User.findByPk(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(
        `Access denied. Role '${req.user.role}' is not permitted here.`,
        403
      )
    );
  }
  next();
};
