import type { Request, Response } from 'express';

import { OpenApiMergeService } from '../services/openapiMergeService.js';
import { OpenApiValidatorService } from '../services/openapiValidatorService.js';
import { extractDocumentInputs } from '../utils/documentInput.js';
import { HttpError } from '../utils/httpError.js';

const merger = new OpenApiMergeService();
const validator = new OpenApiValidatorService();

export async function mergeController(req: Request, res: Response): Promise<void> {
  const maxUploadSizeBytes = (Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '5', 10) || 5) * 1024 * 1024;
  const inputs = extractDocumentInputs(req, maxUploadSizeBytes);

  if (inputs.length === 0) {
    throw new HttpError(400, 'No OpenAPI documents provided. Upload files or paste raw JSON.');
  }

  const validation = validator.validate(inputs);
  if (!validation.valid) {
    throw new HttpError(
      400,
      `Input validation failed for ${validation.issues.length} document(s). Fix invalid OpenAPI documents before merge.`,
      validation.issues,
    );
  }

  const mergedResult = merger.mergeDocuments(validation.validDocuments.map((item) => item.document));
  res.status(200).json({
    merged: mergedResult.mergedSpec,
    warnings: mergedResult.warnings,
    conflicts: mergedResult.conflicts,
    summary: mergedResult.stats,
  });
}
