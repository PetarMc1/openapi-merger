import { memo } from 'react';
import type { UiWarning } from '../types/app';

type MergeWarningsProps = {
  warnings: UiWarning[];
};

function MergeWarningsContent({ warnings }: MergeWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="warning-box" aria-labelledby="merge-warning-title">
      <h3 id="merge-warning-title" className="warning-title">
        Merge warnings ({warnings.length})
      </h3>
      <ul className="warning-list">
        {warnings.map((warning, index) => (
          <li key={`${warning.type}-${warning.path ?? warning.schemaName ?? index}`}>
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export const MergeWarnings = memo(MergeWarningsContent, (prev, next) => prev.warnings.length === next.warnings.length);
