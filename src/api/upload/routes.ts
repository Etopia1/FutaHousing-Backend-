import express from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { uploadFile } from './controller';
import { storage } from '../../config/cloudinary';

const router = express.Router();

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Upload Single File
router.post('/', authenticate, upload.single('file'), uploadFile);

export default router;
