import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  res.status(200).json({ success: true, user: user.toPublicJSON() });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const forbidden = ['password', 'role', 'email'];
  forbidden.forEach((field) => delete req.body[field]);

  const user = await User.findByPk(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (req.body.availableSlots !== undefined) {
    user.availableSlots = req.body.availableSlots;
    user.changed('availableSlots', true);
    delete req.body.availableSlots;
  }

  await user.update(req.body);
  await user.save();
  res.status(200).json({ success: true, user: user.toPublicJSON() });
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(new AppError('Current password is incorrect.', 401));

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated successfully.' });
});

export const uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please select an image file to upload.', 400));
  }

  const user = await User.findByPk(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  user.avatar = avatarUrl;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Avatar updated successfully.',
    avatarUrl,
    user: user.toPublicJSON(),
  });
});
