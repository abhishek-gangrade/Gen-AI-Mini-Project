import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadDocument,
  createDirectDocument,
  getDocuments,
  deleteDocument,
  testRAGQuery
} from '../controllers/knowledgeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt', '.docx', '.doc', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, TXT, and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter
});

router.use(protect);

router.post('/upload', authorize('admin', 'supervisor'), upload.single('file'), uploadDocument);
router.post('/direct', authorize('admin', 'supervisor'), createDirectDocument);
router.get('/', getDocuments);
router.delete('/:id', authorize('admin', 'supervisor'), deleteDocument);
router.post('/test-query', testRAGQuery);

export default router;
