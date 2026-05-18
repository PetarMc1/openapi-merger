import type { OpenApiDocument } from '../../../shared/src/schemas.js';

export type MergeWarningType =
  | 'duplicate-schema-name'
  | 'duplicate-path'
  | 'duplicate-tag'
  | 'duplicate-server'
  | 'security-scheme-overwrite'
  | 'component-collision';

export type MergeConflictType =
  | 'conflicting-endpoint-definition'
  | 'incompatible-http-method'
  | 'mismatched-request-schema'
  | 'mismatched-response-schema'
  | 'invalid-method-shape';

export type MergeWarning = {
  type: MergeWarningType;
  message: string;
  documentIndex: number;
  path?: string;
  method?: string;
  schemaName?: string;
  componentKey?: string;
};

export type MergeConflict = {
  type: MergeConflictType;
  message: string;
  documentIndex: number;
  path: string;
  method?: string;
  details?: Record<string, unknown>;
};

export type MergeStats = {
  sourceCount: number;
  pathCount: number;
  operationCount: number;
  schemaCount: number;
  componentCount: number;
  warningCount: number;
  conflictCount: number;
};

export type MergeEngineResult = {
  mergedSpec: OpenApiDocument;
  warnings: MergeWarning[];
  conflicts: MergeConflict[];
  stats: MergeStats;
};

export type DocumentInput = {
  raw: string;
  source: string;
};

export type ValidatedDocument = {
  document: OpenApiDocument;
  source: string;
  documentIndex: number;
};

export type ValidationIssue = {
  documentIndex: number;
  source: string;
  message: string;
  details?: unknown;
};

export type ValidationResult = {
  valid: boolean;
  validDocuments: ValidatedDocument[];
  issues: ValidationIssue[];
};
