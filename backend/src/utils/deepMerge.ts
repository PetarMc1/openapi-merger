type JsonLike = Record<string, unknown>;

function isObject(value: unknown): value is JsonLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepCloneSafe<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (Array.isArray(value)) {
    return value.map((entry) => deepCloneSafe(entry, seen)) as T;
  }

  if (!isObject(value)) {
    return value;
  }

  if (seen.has(value)) {
    throw new Error('Circular reference detected while cloning object.');
  }

  const output: JsonLike = {};
  seen.set(value, output);

  for (const [key, child] of Object.entries(value)) {
    output[key] = deepCloneSafe(child, seen);
  }

  return output as T;
}

export function deepMergeSafe<T extends JsonLike>(target: T, source: JsonLike, seen = new WeakSet<object>()): T {
  if (seen.has(source)) {
    throw new Error('Circular reference detected while deep merging source object.');
  }

  seen.add(source);

  const mutableTarget = target as Record<string, unknown>;

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = mutableTarget[key];

    if (Array.isArray(sourceValue)) {
      mutableTarget[key] = deepCloneSafe(sourceValue) as unknown;
      continue;
    }

    if (isObject(sourceValue)) {
      if (isObject(targetValue)) {
        mutableTarget[key] = deepMergeSafe(targetValue, sourceValue, seen);
      } else {
        mutableTarget[key] = deepCloneSafe(sourceValue);
      }
      continue;
    }

    mutableTarget[key] = sourceValue;
  }

  return target;
}
