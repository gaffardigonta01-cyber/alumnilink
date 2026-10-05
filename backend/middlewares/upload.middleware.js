import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'referrals');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Supported types: PDF, DOC, DOCX, TXT, Images, ZIP`));
  }
};

export const uploadReferralAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
});

const resourceUploadDir = path.join(__dirname, '..', 'uploads', 'resources');
if (!fs.existsSync(resourceUploadDir)) {
  fs.mkdirSync(resourceUploadDir, { recursive: true });
}

const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resourceUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

export const uploadResourceAttachment = multer({
  storage: resourceStorage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

const avatarFileFilter = (_req, file, cb) => {
  const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed (${allowedExts.join(', ')})`));
  }
};

export const uploadAvatarAttachment = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});

export default uploadReferralAttachment;

