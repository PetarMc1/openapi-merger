import type { ChangeEvent } from 'react';

import type { MergeSourceMode, MergeSourceSlot } from '../types/app';

type MergeSourcesPanelProps = {
  slots: MergeSourceSlot[];
  minSlots: number;
  isLoading: boolean;
  onAddSlot: () => void;
  onRemoveSlot: (slotId: string) => void;
  onModeChange: (slotId: string, mode: MergeSourceMode) => void;
  onPasteChange: (slotId: string, value: string) => void;
  onUrlChange: (slotId: string, value: string) => void;
  onFileChange: (slotId: string, file: File | null) => void;
  onFetchRemote: (slotId: string) => void;
};

const modeLabel: Record<MergeSourceMode, string> = {
  upload: 'Upload file',
  paste: 'Paste JSON',
  github: 'GitHub URL',
  url: 'Fetch URL',
};

function modeDescription(mode: MergeSourceMode): string {
  if (mode === 'upload') {
    return 'Choose a local .json file for this source.';
  }

  if (mode === 'paste') {
    return 'Paste plain JSON text for this source (no Monaco editor).';
  }

  if (mode === 'github') {
    return 'Provide a GitHub file URL and fetch it into this source.';
  }

  return 'Provide any raw JSON URL and fetch it into this source.';
}

export function MergeSourcesPanel({
  slots,
  minSlots,
  isLoading,
  onAddSlot,
  onRemoveSlot,
  onModeChange,
  onPasteChange,
  onUrlChange,
  onFileChange,
  onFetchRemote,
}: MergeSourcesPanelProps) {
  return (
    <section className="card panel-animate sources-panel" aria-labelledby="sources-panel-title">
      <div className="sources-panel_header">
        <div>
          <h2 id="sources-panel-title" className="static-page_title">
            Source files to merge
          </h2>
          <p className="static-page_updated">Each source is independent. Pick input mode per source.</p>
        </div>

        <div className="sources-panel_actions" role="group" aria-label="Manage source slots">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onAddSlot} disabled={isLoading}>
            + Add source
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const last = slots[slots.length - 1];
              if (last) {
                onRemoveSlot(last.id);
              }
            }}
            disabled={isLoading || slots.length <= minSlots}
          >
            - Remove source
          </button>
        </div>
      </div>

      <div className="sources-grid" aria-live="polite">
        {slots.map((slot, index) => {
          const canRemove = slots.length > minSlots;

          return (
            <section key={slot.id} className="source-slot" aria-labelledby={`source-slot-${slot.id}-title`}>
              <header className="source-slot_header">
                <h3 id={`source-slot-${slot.id}-title`} className="warning-title">
                  Source {index + 1}
                </h3>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onRemoveSlot(slot.id)}
                  disabled={!canRemove || isLoading}
                  aria-label={`Remove source ${index + 1}`}
                >
                  Remove
                </button>
              </header>

              <div className="field">
                <label className="label" htmlFor={`source-mode-${slot.id}`}>
                  Input mode
                </label>
                <select
                  id={`source-mode-${slot.id}`}
                  className="input"
                  value={slot.mode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    onModeChange(slot.id, event.target.value as MergeSourceMode)
                  }
                  disabled={isLoading}
                >
                  {Object.entries(modeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="label-hint">{modeDescription(slot.mode)}</p>
              </div>

              {slot.mode === 'upload' ? (
                <div className="field">
                  <label className="label" htmlFor={`source-file-${slot.id}`}>
                    OpenAPI JSON file
                  </label>
                  <input
                    id={`source-file-${slot.id}`}
                    type="file"
                    className="input"
                    accept="application/json,.json"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onFileChange(slot.id, event.target.files?.[0] ?? null)
                    }
                    disabled={isLoading}
                  />
                  <p className="label-hint">{slot.file ? `Selected: ${slot.file.name}` : 'No file selected.'}</p>
                </div>
              ) : null}

              {slot.mode === 'paste' ? (
                <div className="field">
                  <label className="label" htmlFor={`source-paste-${slot.id}`}>
                    Paste OpenAPI JSON
                  </label>
                  <textarea
                    id={`source-paste-${slot.id}`}
                    className="input textarea"
                    rows={8}
                    placeholder='{"openapi":"3.0.3","info":{"title":"API","version":"1.0.0"},"paths":{}}'
                    value={slot.pasteValue}
                    onChange={(event) => onPasteChange(slot.id, event.target.value)}
                    disabled={isLoading}
                  />
                </div>
              ) : null}

              {slot.mode === 'github' || slot.mode === 'url' ? (
                <>
                  <div className="field">
                    <label className="label" htmlFor={`source-url-${slot.id}`}>
                      {slot.mode === 'github' ? 'GitHub file URL' : 'Remote JSON URL'}
                    </label>
                    <input
                      id={`source-url-${slot.id}`}
                      className="input"
                      type="url"
                      placeholder={
                        slot.mode === 'github'
                          ? 'https://github.com/org/repo/blob/main/openapi.json'
                          : 'https://example.com/openapi.json'
                      }
                      value={slot.remoteUrl}
                      onChange={(event) => onUrlChange(slot.id, event.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="source-slot_fetch-row">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => onFetchRemote(slot.id)}
                      disabled={isLoading || slot.remoteUrl.trim().length === 0}
                    >
                      Fetch now
                    </button>
                    <p className="label-hint">
                      {slot.fetchedValue
                        ? `Fetched ${Math.round(slot.fetchedValue.length / 1024)} KB`
                        : 'No fetched content yet.'}
                    </p>
                  </div>
                </>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
