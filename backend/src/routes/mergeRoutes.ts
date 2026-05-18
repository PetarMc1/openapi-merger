import express from 'express';
import multer from 'multer';

import { mergeController } from '../controllers/mergeController.js';
import { validateController } from '../controllers/validateController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '5', 10) || 5) * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, callback) => {
    const isJson = file.mimetype === 'application/json' || file.originalname.toLowerCase().endsWith('.json');
    if (!isJson) {
      callback(new Error(`Only JSON files are supported. Rejected: ${file.originalname}`));
      return;
    }

    callback(null, true);
  },
});

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'openapi-json-merger-backend',
  });
});

router.post('/validate', upload.array('specFiles', 20), asyncHandler(validateController));
router.post('/merge', upload.array('specFiles', 20), asyncHandler(mergeController));

export { router as mergeRoutes };
