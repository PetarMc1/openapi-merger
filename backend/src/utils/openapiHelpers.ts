const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

type AnyObject = Record<string, unknown>;

export function isObject(value: unknown): value is AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ensureObject(value: unknown): AnyObject {
  return isObject(value) ? value : {};
}

export function normalizeHttpMethod(value: string): string {
  return value.toLowerCase();
}

export function isHttpMethod(value: string): boolean {
  return HTTP_METHODS.has(normalizeHttpMethod(value));
}

export function stableStringify(value: unknown, seen = new WeakSet<object>()): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry, seen)).join(',')}]`;
  }

  if (isObject(value)) {
    if (seen.has(value)) {
      return '"__circular__"';
    }

    seen.add(value);
    return `{${Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function deepEqual(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

export function countOperations(paths: unknown): number {
  const pathsObject = ensureObject(paths);
  let total = 0;

  for (const pathItem of Object.values(pathsObject)) {
    const operations = ensureObject(pathItem);
    for (const method of Object.keys(operations)) {
      if (isHttpMethod(method)) {
        total += 1;
      }
    }
  }

  return total;
}

export function dedupeArrayByValue<T>(values: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const key = stableStringify(value);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }

  return out;
}

export function extractSchemaRefs(operationLike: unknown, location: 'request' | 'response', statusCode?: string): string[] {
  const operation = ensureObject(operationLike);
  const refs = new Set<string>();

  const collectRefsFromContent = (contentLike: unknown) => {
    const content = ensureObject(contentLike);
    for (const mediaType of Object.values(content)) {
      const schema = ensureObject(ensureObject(mediaType).schema);
      if (typeof schema.$ref === 'string') {
        refs.add(schema.$ref);
      }
    }
  };

  if (location === 'request') {
    const requestBody = ensureObject(operation.requestBody);
    collectRefsFromContent(requestBody.content);
    return Array.from(refs);
  }

  const responses = ensureObject(operation.responses);

  if (statusCode) {
    const response = ensureObject(responses[statusCode]);
    collectRefsFromContent(response.content);
    return Array.from(refs);
  }

  for (const response of Object.values(responses)) {
    collectRefsFromContent(ensureObject(response).content);
  }

  return Array.from(refs);
}
