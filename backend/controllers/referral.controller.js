import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Referral, User, Notification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'referrals');

export const getReferrals = asyncHandler(async (req, res) => {
  const where = req.user.role === 'student'
    ? { studentId: req.user.id }
    : { alumniId: req.user.id };

  const referrals = await Referral.findAll({
    where,
    include: [
      { model: User, as: 'student', attributes: ['id', 'name', 'email', 'avatar', 'major', 'graduationYear', 'bio'] },
      { model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'avatar', 'jobTitle', 'company'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({ success: true, referrals });
});

export const uploadAttachment = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded.', 400));
  }

  const fileUrl = `/uploads/referrals/${req.file.filename}`;
  const fileSizeInMB = (req.file.size / (1024 * 1024)).toFixed(2);
  const sizeFormatted = req.file.size < 1024 * 1024
    ? `${(req.file.size / 1024).toFixed(1)} KB`
    : `${fileSizeInMB} MB`;

  res.status(200).json({
    success: true,
    fileUrl,
    fileName: req.file.originalname,
    fileSize: sizeFormatted,
    mimeType: req.file.mimetype,
  });
});

export const downloadAttachment = asyncHandler(async (req, res, next) => {
  const { filename } = req.params;
  const originalName = req.query.name || filename;
  const filePath = path.join(uploadDir, path.basename(filename));

  if (!fs.existsSync(filePath)) {
    return next(new AppError('Attachment not found on server.', 404));
  }

  res.download(filePath, originalName, (err) => {
    if (err && !res.headersSent) {
      next(new AppError('Failed to download attachment.', 500));
    }
  });
});

export const createReferral = asyncHandler(async (req, res, next) => {
  const {
    alumniId,
    company,
    role,
    jobTitle,
    jobUrl,
    resumeUrl,
    attachmentUrl,
    attachmentName,
    attachmentSize,
    attachments,
    note
  } = req.body;

  const targetTitle = jobTitle || role;

  if (!alumniId || !company || !targetTitle) {
    return next(new AppError('alumniId, company, and role are required.', 400));
  }

  const finalAttachmentUrl = attachmentUrl || resumeUrl || '';
  const finalResumeUrl = resumeUrl || attachmentUrl || '';

  const referral = await Referral.create({
    studentId: req.user.id,
    alumniId,
    company,
    jobTitle: targetTitle,
    jobUrl: jobUrl || '',
    resumeUrl: finalResumeUrl,
    attachmentUrl: finalAttachmentUrl,
    attachmentName: attachmentName || (finalAttachmentUrl ? path.basename(finalAttachmentUrl) : ''),
    attachmentSize: attachmentSize || '',
    attachments: attachments || (finalAttachmentUrl ? [{ url: finalAttachmentUrl, name: attachmentName || 'Attachment', size: attachmentSize || '' }] : []),
    note: note || '',
    status: 'submitted',
  });

  // Notify alumni of the new referral request
  try {
    const studentName = req.user.name || 'A student';
    await Notification.create({
      userId: alumniId,
      type: 'referral',
      title: 'New Referral Request',
      body: `${studentName} requested a job referral for "${targetTitle}" at ${company}.`,
      action: '/referrals',
      avatar: studentName.slice(0, 2).toUpperCase(),
      avatarColor: '#16428c',
      read: false,
      metadata: { referralId: referral.id, studentId: req.user.id },
    });
  } catch (err) {
    console.error('Failed to create referral notification:', err.message);
  }

  const fullReferral = await Referral.findByPk(referral.id, {
    include: [
      { model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'avatar', 'jobTitle', 'company'] },
      { model: User, as: 'student', attributes: ['id', 'name', 'email', 'avatar', 'major', 'graduationYear', 'bio'] },
    ],
  });

  res.status(201).json({ success: true, referral: fullReferral });
});

export const updateReferralStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const referral = await Referral.findByPk(req.params.id);
  if (!referral) return next(new AppError('Referral not found.', 404));

  if (referral.alumniId !== req.user.id) {
    return next(new AppError('Only the requested alumni can update this referral.', 403));
  }

  referral.status = status;
  await referral.save();

  // Notify student of referral status update
  try {
    const statusLabel = status === 'referred' ? 'endorsed & submitted' : status;
    await Notification.create({
      userId: referral.studentId,
      type: 'referral',
      title: status === 'referred' ? '🎉 Referral Request Endorsed!' : 'Referral Request Updated',
      body: `Your referral request for "${referral.jobTitle}" at ${referral.company} was ${statusLabel} by ${req.user.name}.`,
      action: '/referrals',
      avatar: req.user.name.slice(0, 2).toUpperCase(),
      avatarColor: '#d4af37',
      read: false,
      metadata: { referralId: referral.id },
    });
  } catch (err) {
    console.error('Failed to create referral update notification:', err.message);
  }
  res.status(200).json({ success: true, referral });
});
