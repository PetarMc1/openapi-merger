type ActionToolbarProps = {
  isLoading: boolean;
  canExport: boolean;
  onMerge: () => void;
  onCopy: () => void;
  onDownload: () => void;
};

export function ActionToolbar({ isLoading, canExport, onMerge, onCopy, onDownload }: ActionToolbarProps) {
  return (
    <div className="action-toolbar" role="toolbar" aria-label="Merge and export actions">
      <button
        type="button"
        className="btn btn--primary merge-btn"
        onClick={onMerge}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Merging...
          </>
        ) : (
          'Merge OpenAPI Documents'
        )}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={onCopy}
        disabled={!canExport || isLoading}
        title="Copy merged JSON to clipboard"
      >
        Copy JSON
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={onDownload}
        disabled={!canExport || isLoading}
        title="Download merged JSON file"
      >
        Download JSON
      </button>
    </div>
  );
}
