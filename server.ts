import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/api.ts';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Mount API router
app.use('/api', apiRouter);

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve frontend in production if dist exists
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen if executed directly, NOT when imported by vite.config.ts or test runners
const isDirectRun = () => {
  try {
    if (process.env.RUN_STANDALONE === 'true') return true;
    if (process.argv[1]) {
      const currentFilePath = fileURLToPath(import.meta.url);
      return path.resolve(process.argv[1]) === path.resolve(currentFilePath);
    }
  } catch {
    return false;
  }
  return false;
};

if (isDirectRun()) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ProjectFlow] Server listening on port ${PORT}`);
  });
}

export default app;
