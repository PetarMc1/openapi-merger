import { ActionToolbar } from './ActionToolbar';
import { JsonPreview } from './JsonPreview';
import { LoadingSkeleton } from './LoadingSkeleton';
import { MergeWarnings } from './MergeWarnings';
import type { UiWarning } from '../types/app';

type ResultPreviewPanelProps = {
  isLoading: boolean;
  mergeProgress: string | null;
  mergedOutput: string | null;
  warnings: UiWarning[];
  onMerge: () => void;
  onCopy: () => void;
  onDownload: () => void;
};

export function ResultPreviewPanel({
  isLoading,
  mergeProgress,
  mergedOutput,
  warnings,
  onMerge,
  onCopy,
  onDownload,
}: ResultPreviewPanelProps) {
  return (
    <section className="output-section panel-animate" aria-labelledby="result-panel-title">
      <h2 id="result-panel-title" className="static-page_title">
        Result preview
      </h2>
      <p className="static-page_updated">Merged output, conflicts, and export actions.</p>

      {isLoading && mergeProgress ? (
        <div className="merge-progress" aria-live="polite" aria-atomic="true">
          <div className="progress-spinner"></div>
          <span>{mergeProgress}</span>
        </div>
      ) : null}

      <section className="warning-panel" aria-labelledby="warnings-panel-title">
        <h3 id="warnings-panel-title" className="warning-title">
          Merge warnings
        </h3>
        <MergeWarnings warnings={warnings} />
        {!isLoading && warnings.length === 0 ? <p className="preview-status">No merge warnings.</p> : null}
      </section>

      <section className="preview-panel" aria-labelledby="preview-json-title">
        <h3 id="preview-json-title" className="warning-title">
          JSON result
        </h3>
        {isLoading ? <LoadingSkeleton rows={9} /> : null}
        {!isLoading && !mergedOutput ? <p className="preview-status">Merge result will appear here.</p> : null}
        {!isLoading && mergedOutput ? <JsonPreview value={mergedOutput} /> : null}
      </section>

      <ActionToolbar
        isLoading={isLoading}
        canExport={Boolean(mergedOutput)}
        onMerge={onMerge}
        onCopy={onCopy}
        onDownload={onDownload}
      />
    </section>
  );
}
