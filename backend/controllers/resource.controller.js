import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { Resource, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getResources = asyncHandler(async (req, res) => {
  const resources = await Resource.findAll({
    include: [
      { model: User, as: 'uploader', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const savedList = Array.isArray(req.user?.savedResources) ? req.user.savedResources.map(Number) : [];
  const resourcesWithSaved = resources.map(r => {
    const json = r.toJSON();
    return {
      ...json,
      saved: savedList.includes(Number(r.id)),
    };
  });

  res.status(200).json({ success: true, resources: resourcesWithSaved });
});

export const uploadAttachment = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded.', 400));
  }

  const fileUrl = `/uploads/resources/${req.file.filename}`;
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

export const createResource = asyncHandler(async (req, res, next) => {
  let { title, description, type, category, url, tags, fileName, fileSize } = req.body;

  if (!title) return next(new AppError('Title is required.', 400));

  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch (e) {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  let finalUrl = url || '';
  let finalFileName = fileName || '';
  let finalFileSize = fileSize || '';

  if (req.file) {
    finalUrl = `/uploads/resources/${req.file.filename}`;
    finalFileName = req.file.originalname;
    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(1);
    finalFileSize = req.file.size < 1024 * 1024
      ? `${(req.file.size / 1024).toFixed(0)} KB`
      : `${sizeInMB} MB`;
  }

  const resource = await Resource.create({
    uploaderId: req.user.id,
    title,
    description: description || '',
    type: type || 'Guide',
    category: category || type || 'Career Guidance',
    url: finalUrl,
    fileName: finalFileName,
    fileSize: finalFileSize,
    tags: tags || [],
  });

  const full = await Resource.findByPk(resource.id, {
    include: [
      { model: User, as: 'uploader', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company'] },
    ],
  });

  res.status(201).json({ success: true, resource: full });
});

export const viewResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByPk(req.params.id, {
    include: [
      { model: User, as: 'uploader', attributes: ['id', 'name', 'role', 'company'] },
    ],
  });
  if (!resource) return next(new AppError('Resource not found.', 404));

  // If local file exists on server
  if (resource.url && resource.url.startsWith('/uploads/')) {
    const relativePath = resource.url.replace(/^\//, '');
    const absolutePath = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(absolutePath)) {
      const ext = path.extname(absolutePath).toLowerCase();
      const contentTypes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.txt': 'text/plain; charset=utf-8',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      if (contentTypes[ext]) {
        res.setHeader('Content-Type', contentTypes[ext]);
      }
      res.setHeader('Content-Disposition', `inline; filename="${resource.fileName || path.basename(absolutePath)}"`);
      return res.sendFile(absolutePath);
    }
  }

  // If external URL pointing directly to a document/link
  if (resource.url && resource.url.startsWith('http')) {
    return res.redirect(resource.url);
  }

  // Always generate and stream a professional PDF document so browser opens PDF viewer
  const sanitizedTitle = (resource.title || 'document').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(sanitizedTitle)}.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // Top header color accent bar
  doc.rect(0, 0, doc.page.width, 12).fill('#16428c');

  // Header tag
  doc.moveDown(1.5);
  doc.fontSize(9).fillColor('#16428c').font('Helvetica-Bold').text('ALUMNILINK • STUDENT MENTORSHIP & RESOURCE LIBRARY', { characterSpacing: 1 });
  doc.moveDown(0.4);

  // Title
  doc.fontSize(22).fillColor('#0f172a').font('Helvetica-Bold').text(resource.title || 'Resource Guide');
  doc.moveDown(0.5);

  // Metadata Line
  const authorName = resource.uploader?.name || 'Alumni Mentor';
  const authorCompany = resource.uploader?.company ? ` (${resource.uploader.company})` : '';
  const dateStr = resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'Recent';
  const typeStr = resource.type || 'PDF Guide';

  doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(`Uploaded by: ${authorName}${authorCompany}   |   Format: ${typeStr}   |   Date: ${dateStr}`);
  
  // Dividing Line
  doc.moveDown(0.8);
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(1.2);

  // Content body
  doc.fontSize(12).fillColor('#334155').font('Helvetica').lineGap(5).text(
    resource.description || 'This document contains notes, frameworks, and study materials shared directly by alumni mentors.'
  );

  // Footer branding
  const bottomY = doc.page.height - 40;
  doc.fontSize(8.5).fillColor('#94a3b8').text(
    'AlumniLink Mentorship Network — University Career Development & Academic Sharing',
    50,
    bottomY,
    { align: 'center', width: doc.page.width - 100 }
  );

  doc.end();
});

export const downloadResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByPk(req.params.id);
  if (!resource) return next(new AppError('Resource not found.', 404));

  await resource.increment('downloads');
  await resource.reload();

  res.status(200).json({ success: true, downloads: resource.downloads });
});

export const toggleSave = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByPk(req.params.id);
  if (!resource) return next(new AppError('Resource not found.', 404));

  const resourceId = Number(resource.id);
  const user = req.user;
  let savedList = Array.isArray(user.savedResources) ? [...user.savedResources] : [];
  const exists = savedList.some(id => Number(id) === resourceId);

  let isSaved = false;
  if (exists) {
    savedList = savedList.filter(id => Number(id) !== resourceId);
    if (resource.likes > 0) await resource.decrement('likes');
    isSaved = false;
  } else {
    savedList.push(resourceId);
    await resource.increment('likes');
    isSaved = true;
  }

  user.savedResources = savedList;
  user.changed('savedResources', true);
  await user.save();
  await resource.reload();

  res.status(200).json({
    success: true,
    saved: isSaved,
    saveCount: resource.likes,
    savedResources: savedList,
    user: user.toPublicJSON(),
  });
});

export const deleteResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByPk(req.params.id);
  if (!resource) return next(new AppError('Resource not found.', 404));

  if (resource.uploaderId !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Not authorized.', 403));
  }

  await resource.destroy();
  res.status(200).json({ success: true, message: 'Resource deleted.' });
});
