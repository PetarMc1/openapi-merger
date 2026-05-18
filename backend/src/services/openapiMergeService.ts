import type { OpenApiDocument } from '../../../shared/src/schemas.js';
import type { MergeConflict, MergeEngineResult, MergeWarning } from '../types/merge.js';
import { deepCloneSafe, deepMergeSafe } from '../utils/deepMerge.js';
import {
  countOperations,
  dedupeArrayByValue,
  deepEqual,
  ensureObject,
  extractSchemaRefs,
  isHttpMethod,
  normalizeHttpMethod,
} from '../utils/openapiHelpers.js';

type AnyObject = Record<string, unknown>;

function replaceSchemaRefs(value: unknown, renameMap: Map<string, string>): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => replaceSchemaRefs(entry, renameMap));
  }

  if (typeof value === 'object' && value !== null) {
    const current = value as AnyObject;
    const output: AnyObject = {};

    for (const [key, child] of Object.entries(current)) {
      if (key === '$ref' && typeof child === 'string') {
        const prefix = '#/components/schemas/';
        if (child.startsWith(prefix)) {
          const sourceName = child.slice(prefix.length);
          const renamed = renameMap.get(sourceName);
          output[key] = renamed ? `${prefix}${renamed}` : child;
          continue;
        }
      }

      output[key] = replaceSchemaRefs(child, renameMap);
    }

    return output;
  }

  return value;
}

function collectComponentCount(components: unknown): number {
  const sections = ensureObject(components);
  let total = 0;

  for (const section of Object.values(sections)) {
    total += Object.keys(ensureObject(section)).length;
  }

  return total;
}

function compareOperationSchemas(
  path: string,
  method: string,
  existingOperation: unknown,
  incomingOperation: unknown,
  documentIndex: number,
): MergeConflict[] {
  const conflicts: MergeConflict[] = [];

  const existingRequestRefs = extractSchemaRefs(existingOperation, 'request');
  const incomingRequestRefs = extractSchemaRefs(incomingOperation, 'request');

  const sameRequestRefs =
    existingRequestRefs.length === incomingRequestRefs.length &&
    existingRequestRefs.every((ref) => incomingRequestRefs.includes(ref));

  if (existingRequestRefs.length > 0 && incomingRequestRefs.length > 0 && !sameRequestRefs) {
    conflicts.push({
      type: 'mismatched-request-schema',
      path,
      method,
      documentIndex,
      message: `Request body schema mismatch on ${method.toUpperCase()} ${path}.`,
      details: {
        existingRequestRefs,
        incomingRequestRefs,
      },
    });
  }

  const responseStatuses = new Set<string>([
    ...Object.keys(ensureObject(ensureObject(existingOperation).responses)),
    ...Object.keys(ensureObject(ensureObject(incomingOperation).responses)),
  ]);

  for (const statusCode of responseStatuses) {
    const existingResponseRefs = extractSchemaRefs(existingOperation, 'response', statusCode);
    const incomingResponseRefs = extractSchemaRefs(incomingOperation, 'response', statusCode);

    const sameResponseRefs =
      existingResponseRefs.length === incomingResponseRefs.length &&
      existingResponseRefs.every((ref) => incomingResponseRefs.includes(ref));

    if (existingResponseRefs.length > 0 && incomingResponseRefs.length > 0 && !sameResponseRefs) {
      conflicts.push({
        type: 'mismatched-response-schema',
        path,
        method,
        documentIndex,
        message: `Response schema mismatch on ${method.toUpperCase()} ${path} [${statusCode}].`,
        details: {
          statusCode,
          existingResponseRefs,
          incomingResponseRefs,
        },
      });
    }
  }

  return conflicts;
}

export class OpenApiMergeService {
  public mergeDocuments(documents: OpenApiDocument[]): MergeEngineResult {
    if (documents.length === 0) {
      throw new Error('mergeDocuments requires at least one document.');
    }

    const warnings: MergeWarning[] = [];
    const conflicts: MergeConflict[] = [];

    const mergedSpec = deepCloneSafe(documents[0]);

    mergedSpec.paths = ensureObject(mergedSpec.paths);
    mergedSpec.components = ensureObject(mergedSpec.components);
    mergedSpec.components.schemas = ensureObject(mergedSpec.components.schemas);
    mergedSpec.components.securitySchemes = ensureObject(mergedSpec.components.securitySchemes);
    mergedSpec.tags = Array.isArray(mergedSpec.tags) ? mergedSpec.tags : [];
    mergedSpec.servers = Array.isArray(mergedSpec.servers) ? mergedSpec.servers : [];

    for (let documentIndex = 1; documentIndex < documents.length; documentIndex += 1) {
      const document = deepCloneSafe(documents[documentIndex]);
      const renameMap = new Map<string, string>();

      const documentComponents = ensureObject(document.components);
      document.components = documentComponents;
      documentComponents.schemas = ensureObject(documentComponents.schemas);
      documentComponents.securitySchemes = ensureObject(documentComponents.securitySchemes);
      document.paths = ensureObject(document.paths);

      const targetSchemas = ensureObject(mergedSpec.components.schemas);
      const incomingSchemas = ensureObject(document.components.schemas);

      for (const [schemaName, incomingSchema] of Object.entries(incomingSchemas)) {
        if (!(schemaName in targetSchemas)) {
          targetSchemas[schemaName] = incomingSchema;
          continue;
        }

        if (deepEqual(targetSchemas[schemaName], incomingSchema)) {
          warnings.push({
            type: 'duplicate-schema-name',
            schemaName,
            documentIndex,
            message: `Schema '${schemaName}' was duplicated with equivalent content.`,
          });
          continue;
        }

        let suffix = 2;
        let renamed = `${schemaName}_doc${documentIndex + 1}`;
        while (renamed in targetSchemas) {
          renamed = `${schemaName}_doc${documentIndex + 1}_${suffix}`;
          suffix += 1;
        }

        renameMap.set(schemaName, renamed);
        targetSchemas[renamed] = incomingSchema;

        warnings.push({
          type: 'duplicate-schema-name',
          schemaName,
          documentIndex,
          message: `Schema '${schemaName}' conflicts with existing schema and was renamed to '${renamed}'.`,
        });
      }

      document.paths = replaceSchemaRefs(document.paths, renameMap) as OpenApiDocument['paths'];
      document.components = replaceSchemaRefs(document.components, renameMap) as OpenApiDocument['components'];

      const targetPaths = ensureObject(mergedSpec.paths);
      const incomingPaths = ensureObject(document.paths);

      for (const [path, incomingPathItemRaw] of Object.entries(incomingPaths)) {
        if (!(path in targetPaths)) {
          targetPaths[path] = incomingPathItemRaw;
          continue;
        }

        warnings.push({
          type: 'duplicate-path',
          path,
          documentIndex,
          message: `Path '${path}' appears in multiple specifications.`,
        });

        const targetPathItem = ensureObject(targetPaths[path]);
        const incomingPathItem = ensureObject(incomingPathItemRaw);

        for (const [operationKey, incomingOperation] of Object.entries(incomingPathItem)) {
          const method = normalizeHttpMethod(operationKey);

          if (!isHttpMethod(method)) {
            if (operationKey in targetPathItem && !deepEqual(targetPathItem[operationKey], incomingOperation)) {
              conflicts.push({
                type: 'invalid-method-shape',
                path,
                method: operationKey,
                documentIndex,
                message: `Non-method key '${operationKey}' on path '${path}' has conflicting values.`,
              });
              continue;
            }

            targetPathItem[operationKey] = deepCloneSafe(incomingOperation);
            continue;
          }

          if (!(operationKey in targetPathItem)) {
            targetPathItem[operationKey] = deepCloneSafe(incomingOperation);
            continue;
          }

          const existingOperation = targetPathItem[operationKey];
          if (deepEqual(existingOperation, incomingOperation)) {
            continue;
          }

          conflicts.push({
            type: 'incompatible-http-method',
            path,
            method,
            documentIndex,
            message: `Method '${method.toUpperCase()}' on path '${path}' is defined differently across documents.`,
          });

          conflicts.push({
            type: 'conflicting-endpoint-definition',
            path,
            method,
            documentIndex,
            message: `Endpoint '${method.toUpperCase()} ${path}' has conflicting operation definitions.`,
          });

          conflicts.push(...compareOperationSchemas(path, method, existingOperation, incomingOperation, documentIndex));
        }

        targetPaths[path] = targetPathItem;
      }

      mergedSpec.paths = targetPaths;
      mergedSpec.components.schemas = targetSchemas;

      const sectionKeys = [
        'responses',
        'parameters',
        'examples',
        'requestBodies',
        'headers',
        'securitySchemes',
        'links',
        'callbacks',
      ] as const;

      for (const section of sectionKeys) {
        const targetSection = ensureObject(mergedSpec.components[section]);
        const incomingSection = ensureObject(documentComponents[section]);

        for (const [entryKey, incomingValue] of Object.entries(incomingSection)) {
          if (!(entryKey in targetSection)) {
            targetSection[entryKey] = deepCloneSafe(incomingValue);
            continue;
          }

          if (deepEqual(targetSection[entryKey], incomingValue)) {
            warnings.push({
              type: 'component-collision',
              componentKey: `${section}.${entryKey}`,
              documentIndex,
              message: `Component '${section}.${entryKey}' is duplicated with equal content.`,
            });
            continue;
          }

          if (section === 'securitySchemes') {
            warnings.push({
              type: 'security-scheme-overwrite',
              componentKey: `${section}.${entryKey}`,
              documentIndex,
              message: `Security scheme '${entryKey}' conflicted. Keeping first definition.`,
            });
            continue;
          }

          warnings.push({
            type: 'component-collision',
            componentKey: `${section}.${entryKey}`,
            documentIndex,
            message: `Component '${section}.${entryKey}' conflicted. Deep-merging object fields.`,
          });

          if (typeof incomingValue === 'object' && incomingValue !== null && typeof targetSection[entryKey] === 'object' && targetSection[entryKey] !== null) {
            targetSection[entryKey] = deepMergeSafe(ensureObject(targetSection[entryKey]), ensureObject(incomingValue));
          }
        }

        mergedSpec.components[section] = targetSection;
      }

      const incomingTags = Array.isArray(document.tags) ? document.tags : [];
      const existingTagNames = new Set((mergedSpec.tags ?? []).map((tag) => String(ensureObject(tag).name)));
      for (const tag of incomingTags) {
        const name = String(ensureObject(tag).name);
        if (existingTagNames.has(name)) {
          warnings.push({
            type: 'duplicate-tag',
            documentIndex,
            message: `Tag '${name}' already exists and was not duplicated.`,
          });
          continue;
        }

        mergedSpec.tags = [...(mergedSpec.tags ?? []), tag];
        existingTagNames.add(name);
      }

      const currentServers: unknown[] = Array.isArray(mergedSpec.servers) ? [...mergedSpec.servers] : [];
      const incomingServers: unknown[] = Array.isArray(document.servers) ? [...document.servers] : [];
      const combinedServers: unknown[] = dedupeArrayByValue([...currentServers, ...incomingServers]);
      if (combinedServers.length < currentServers.length + incomingServers.length) {
        warnings.push({
          type: 'duplicate-server',
          documentIndex,
          message: 'Duplicate server entries were removed.',
        });
      }
      mergedSpec.servers = combinedServers;
    }

    const stats = {
      sourceCount: documents.length,
      pathCount: Object.keys(ensureObject(mergedSpec.paths)).length,
      operationCount: countOperations(mergedSpec.paths),
      schemaCount: Object.keys(ensureObject(mergedSpec.components?.schemas)).length,
      componentCount: collectComponentCount(mergedSpec.components),
      warningCount: warnings.length,
      conflictCount: conflicts.length,
    };

    return {
      mergedSpec,
      warnings,
      conflicts,
      stats,
    };
  }
}
