import { Op } from 'sequelize';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getAllAlumni = asyncHandler(async (req, res) => {
  const { industry, search, page = 1, limit = 50 } = req.query;

  const where = { role: 'alumni' };
  if (industry) {
    where.industry = { [Op.like]: `%${industry}%` };
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { company: { [Op.like]: `%${search}%` } },
      { jobTitle: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count: total, rows: alumni } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit) || 1,
    alumni,
  });
});

export const getAlumniById = asyncHandler(async (req, res, next) => {
  const alumni = await User.findOne({
    where: { id: req.params.id, role: 'alumni' },
    attributes: { exclude: ['password'] },
  });

  if (!alumni) return next(new AppError('Alumni not found.', 404));

  res.status(200).json({ success: true, alumni });
});
