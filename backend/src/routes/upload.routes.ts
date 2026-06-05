import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/requireAuth.js';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  },
});

const router = Router();

// POST /uploads/image — upload a single image, returns { url }
router.post('/image', requireAuth, upload.single('image'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No image provided' });
    return;
  }
  const baseUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  res.status(201).json({ url: `${baseUrl}/uploads/${req.file.filename}` });
});

export default router;
