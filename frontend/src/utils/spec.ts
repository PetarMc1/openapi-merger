import { openApiDocumentSchema } from 'shared/schemas';

export function normalizeGithubRawUrl(url: string): string {
  const trimmed = url.trim();

  if (trimmed.includes('raw.githubusercontent.com')) {
    return trimmed;
  }

  const blobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (!blobMatch) {
    return trimmed;
  }

  const [, owner, repo, branch, path] = blobMatch;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

export function splitRawSpecs(rawText: string): string[] {
  return rawText
    .split(/\n---+\n/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

export function validateOpenApiSpecChunk(rawChunk: string): { ok: true } | { ok: false; message: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawChunk);
  } catch {
    return { ok: false, message: 'Invalid JSON.' };
  }

  const validated = openApiDocumentSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, message: 'Not a valid OpenAPI 3.x document.' };
  }

  return { ok: true };
}
