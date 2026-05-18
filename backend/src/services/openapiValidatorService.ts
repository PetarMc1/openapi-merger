import { openApiDocumentSchema, type OpenApiDocument } from '../../../shared/src/schemas.js';
import type { DocumentInput, ValidatedDocument, ValidationIssue, ValidationResult } from '../types/merge.js';
import { safeJsonParse } from '../utils/safeJson.js';

export class OpenApiValidatorService {
  public validate(inputs: DocumentInput[]): ValidationResult {
    const validDocuments: ValidatedDocument[] = [];
    const issues: ValidationIssue[] = [];

    inputs.forEach((input, index) => {
      const parsed = safeJsonParse(input.raw);
      if (!parsed.ok) {
        issues.push({
          documentIndex: index,
          source: input.source,
          message: 'Invalid JSON document.',
          details: parsed.error,
        });
        return;
      }

      const validated = openApiDocumentSchema.safeParse(parsed.value);
      if (!validated.success) {
        issues.push({
          documentIndex: index,
          source: input.source,
          message: 'Document is not a valid OpenAPI 3.x specification.',
          details: validated.error.issues,
        });
        return;
      }

      validDocuments.push({
        document: validated.data as OpenApiDocument,
        source: input.source,
        documentIndex: index,
      });
    });

    return {
      valid: issues.length === 0,
      validDocuments,
      issues,
    };
  }
}
