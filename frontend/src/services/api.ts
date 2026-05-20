import type { MergeResult } from '../types/app';

const apiBase = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type JsonErrorBody = {
  error?: unknown;
  details?: unknown;
};

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function mergeOpenApiSpecs(payload: {
  files: File[];
  rawSpecs: string[];
}): Promise<MergeResult> {
  const formData = new FormData();

  payload.files.forEach((file) => {
    formData.append('specFiles', file);
  });

  formData.append('rawSpecs', JSON.stringify(payload.rawSpecs));

  const response = await fetch(`${apiBase}/merge`, {
    method: 'POST',
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as JsonErrorBody | null;

  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Merge failed with status ${response.status}.`;
    throw new ApiError(message, response.status, body?.details);
  }

  if (!body || typeof body !== 'object' || !('merged' in (body as object))) {
    throw new ApiError('Backend returned an invalid merge response payload.', response.status, body ?? undefined);
  }

  return body as unknown as MergeResult;
}
