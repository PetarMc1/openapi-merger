import { z } from 'zod';

export const httpMethodSchema = z.enum([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

export const openApiDocumentSchema = z
  .object({
    openapi: z.string().regex(/^3(\.\d+){1,2}$/, 'Only OpenAPI 3.x documents are supported.'),
    info: z
      .object({
        title: z.string().min(1),
        version: z.string().min(1),
      })
      .passthrough(),
    paths: z.record(z.string(), z.unknown()),
    components: z
      .object({
        schemas: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    tags: z.array(z.object({ name: z.string() }).passthrough()).optional(),
    servers: z.array(z.unknown()).optional(),
    security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  })
  .passthrough();

export const mergeRequestBodySchema = z.object({
  rawSpecs: z.array(z.string()).default([]),
});

export const mergeWarningSchema = z.object({
  type: z.enum([
    'duplicate-schema-name',
    'duplicate-path',
    'duplicate-tag',
    'duplicate-server',
    'security-scheme-overwrite',
    'component-collision',
  ]),
  message: z.string(),
  path: z.string().optional(),
  method: httpMethodSchema.optional(),
  schemaName: z.string().optional(),
  componentKey: z.string().optional(),
  documentIndex: z.number().int().nonnegative(),
});

export const mergeConflictSchema = z.object({
  type: z.enum([
    'conflicting-endpoint-definition',
    'incompatible-http-method',
    'mismatched-request-schema',
    'mismatched-response-schema',
    'invalid-method-shape',
  ]),
  message: z.string(),
  documentIndex: z.number().int().nonnegative(),
  path: z.string(),
  method: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const mergeResponseSchema = z.object({
  merged: openApiDocumentSchema,
  warnings: z.array(mergeWarningSchema),
  conflicts: z.array(mergeConflictSchema),
  summary: z.object({
    sourceCount: z.number().int().positive(),
    pathCount: z.number().int().nonnegative(),
    operationCount: z.number().int().nonnegative(),
    schemaCount: z.number().int().nonnegative(),
    componentCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
  }),
});

export type OpenApiDocument = z.infer<typeof openApiDocumentSchema>;
export type MergeRequestBody = z.infer<typeof mergeRequestBodySchema>;
export type MergeWarning = z.infer<typeof mergeWarningSchema>;
export type MergeConflict = z.infer<typeof mergeConflictSchema>;
export type MergeResponse = z.infer<typeof mergeResponseSchema>;
