import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const signToken = (userId, remember = false) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: remember ? '30d' : (process.env.JWT_EXPIRES_IN || '7d'),
  });

const sendTokenResponse = (user, statusCode, res, remember = false) => {
  const token = signToken(user.id, remember);

  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
};

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, institution, departmentOrTitle, gradYear } = req.body;

  if (!email || !password || !name) {
    return next(new AppError('Please provide name, email, and password.', 400));
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const userData = {
    name,
    email,
    password,
    role: role || 'student',
    company: role === 'alumni' ? (institution || '') : '',
    major: departmentOrTitle || '',
    graduationYear: gradYear && !isNaN(parseInt(gradYear, 10)) ? parseInt(gradYear, 10) : null,
  };

  const user = await User.create(userData);
  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please log in.',
    user: user.toPublicJSON(),
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password, remember } = req.body;
  const targetRole = req.params.role || req.body.role;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const user = await User.findOne({ where: { email: email.trim() } });

  if (!user) {
    return next(new AppError('Invalid email or password.', 401));
  }

  // Cross-role verification: strictly block students from alumni route and alumni from student route
  if (targetRole && user.role !== targetRole) {
    if (user.role === 'student' && targetRole === 'alumni') {
      return next(
        new AppError(
          'Access denied: This email is registered as a student account and cannot access the alumni login route.',
          403
        )
      );
    }
    if (user.role === 'alumni' && targetRole === 'student') {
      return next(
        new AppError(
          'Access denied: This email is registered as an alumni account and cannot access the student login route.',
          403
        )
      );
    }
    return next(
      new AppError(
        `Access denied: This account has the role "${user.role}" and cannot access the ${targetRole} login route.`,
        403
      )
    );
  }

  if (!(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  sendTokenResponse(user, 200, res, Boolean(remember));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  res.status(200).json({ success: true, user: user.toPublicJSON() });
});

export const logout = asyncHandler(async (_req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// In-memory recovery codes cache: email -> { code, expiresAt }
const recoveryCodes = new Map();

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide your email address.', 400));
  }

  const user = await User.findOne({ where: { email: email.trim() } });
  if (!user) {
    return next(new AppError('No account found with this email address.', 404));
  }

  // Generate 6-digit recovery code valid for 15 minutes
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  recoveryCodes.set(email.trim().toLowerCase(), {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: 'A 6-digit verification code has been generated for your account.',
    devCode: code,
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return next(new AppError('Please provide email, verification code, and new password.', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('Password must be at least 8 characters long.', 400));
  }

  const record = recoveryCodes.get(email.trim().toLowerCase());
  if (!record || record.expiresAt < Date.now()) {
    return next(new AppError('Verification code has expired or is invalid. Please request a new one.', 400));
  }

  if (record.code !== code.trim()) {
    return next(new AppError('Invalid verification code.', 400));
  }

  const user = await User.findOne({ where: { email: email.trim() } });
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  user.password = newPassword;
  await user.save();

  // Clear used code
  recoveryCodes.delete(email.trim().toLowerCase());

  res.status(200).json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.',
  });
});
