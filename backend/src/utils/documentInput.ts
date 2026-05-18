import type { Request } from 'express';

import type { DocumentInput } from '../types/merge.js';
import { safeJsonParse } from './safeJson.js';
import { HttpError } from './httpError.js';

const MAX_RAW_SPECS = 50;

function parseRawSpecField(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === 'string') {
    const parsed = safeJsonParse(value);
    if (parsed.ok && Array.isArray(parsed.value) && parsed.value.every((item) => typeof item === 'string')) {
      return parsed.value.map((item) => item.trim()).filter((item) => item.length > 0);
    }

    throw new HttpError(400, 'rawSpecs must be a JSON-encoded array of strings.');
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.map((item) => item.trim()).filter((item) => item.length > 0);
  }

  throw new HttpError(400, 'rawSpecs must be an array of strings or a JSON-encoded array of strings.');
}

export function extractDocumentInputs(req: Request, maxUploadSizeBytes: number): DocumentInput[] {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const rawSpecs = parseRawSpecField(req.body?.rawSpecs);

  if (rawSpecs.length > MAX_RAW_SPECS) {
    throw new HttpError(400, `Too many pasted specs. Maximum allowed is ${MAX_RAW_SPECS}.`);
  }

  const inputs: DocumentInput[] = [];

  files.forEach((file, index) => {
    if (file.size > maxUploadSizeBytes) {
      throw new HttpError(413, `File '${file.originalname}' exceeds the configured size limit.`);
    }

    inputs.push({
      raw: file.buffer.toString('utf8'),
      source: `file:${file.originalname}:${index + 1}`,
    });
  });

  rawSpecs.forEach((raw, index) => {
    if (Buffer.byteLength(raw, 'utf8') > maxUploadSizeBytes) {
      throw new HttpError(413, `Pasted spec block ${index + 1} exceeds the configured size limit.`);
    }

    inputs.push({
      raw,
      source: `raw:${index + 1}`,
    });
  });

  return inputs;
}
