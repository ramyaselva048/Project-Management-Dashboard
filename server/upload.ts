import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Max 25 MB file size limit
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10)) * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.pptx',
  '.ppt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.gif',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.txt',
  '.csv',
  '.json',
  '.md',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = crypto.randomUUID().slice(0, 12);
    const finalName = `${Date.now()}_${sanitizedBase}_${uniqueSuffix}${ext}`;
    cb(null, finalName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || file.mimetype) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Please upload a document, spreadsheet, image, or archive.`));
    }
  },
});
