import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

import { HttpError } from '../utils/httpError.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed.',
      details: error.issues,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error: 'Upload validation failed.',
      details: error.message,
    });
    return;
  }

  if (error instanceof Error && error.message.startsWith('Only JSON files are supported.')) {
    res.status(400).json({
      error: error.message,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error.',
  });
}
