import type { Request, Response } from 'express';
import { OpenApiValidatorService } from '../services/openapiValidatorService.js';
import { extractDocumentInputs } from '../utils/documentInput.js';
import { HttpError } from '../utils/httpError.js';

const validator = new OpenApiValidatorService();

export async function validateController(req: Request, res: Response): Promise<void> {
  const maxUploadSizeBytes = (Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '5', 10) || 5) * 1024 * 1024;
  const inputs = extractDocumentInputs(req, maxUploadSizeBytes);

  if (inputs.length === 0) {
    throw new HttpError(400, 'No OpenAPI documents provided. Upload files or paste raw JSON.');
  }

  const result = validator.validate(inputs);

  res.status(200).json({
    valid: result.valid,
    issues: result.issues,
    stats: {
      sourceCount: inputs.length,
      validCount: result.validDocuments.length,
      invalidCount: result.issues.length,
    },
  });
}
