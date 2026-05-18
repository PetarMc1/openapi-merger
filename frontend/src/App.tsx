import { useCallback, useEffect, useMemo, useState } from 'react';

import { APP_ROUTES, MERGE_PROGRESS_STEPS, STATUS_LABEL } from './constants/app';
import { FooterNav } from './components/FooterNav';
import { HeaderNav } from './components/HeaderNav';
import { MergeSourcesPanel } from './components/MergeSourcesPanel';
import { ResultPreviewPanel } from './components/ResultPreviewPanel';
import { ToastStack } from './components/ToastStack';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useHotkeys } from './hooks/useHotkeys';
import { useToastQueue } from './hooks/useToastQueue';
import { ApiError, mergeOpenApiSpecs } from './services/api';
import { normalizeGithubRawUrl, validateOpenApiSpecChunk } from './utils/spec';
import type { AppRoute, MergeSourceMode, MergeSourceSlot, UiWarning } from './types/app';
import './App.css';

const MIN_SOURCE_SLOTS = 2;

function createSourceSlot(): MergeSourceSlot {
  return {
    id: `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mode: 'upload',
    file: null,
    pasteValue: '',
    remoteUrl: '',
    fetchedValue: '',
  };
}

const faqItems = [
  {
    id: 'input-modes',
    question: 'How can I add specs?',
    answer: 'Use file upload, raw JSON paste, GitHub raw links, or direct URLs in a single merge request.',
  },
  {
    id: 'conflicts',
    question: 'How are conflicts handled?',
    answer: 'Conflicts are reported as warnings, including duplicate paths, schema collisions, and incompatible operations.',
  },
  {
    id: 'schema-collision',
    question: 'What happens with schema name collisions?',
    answer: 'Colliding schemas are auto-renamed with a document suffix and all matching $ref values are updated.',
  },
  {
    id: 'storage',
    question: 'Are my specs stored on the server?',
    answer: 'No persistence is applied by default. Documents are processed in-memory for merge and returned in the response.',
  },
];


function normalizeRoute(pathname: string): AppRoute {
  return APP_ROUTES.includes(pathname as AppRoute) ? (pathname as AppRoute) : '/';
}

function navigateTo(path: AppRoute): void {
  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function FaqPage() {
  return (
    <section className="card static-page" aria-labelledby="faq-title">
      <h2 id="faq-title" className="static-page_title">
        FAQ
      </h2>
      <div className="faq-list">
        {faqItems.map((item) => (
          <details key={item.id} className="faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function TermsPage() {
  return (
    <section className="card static-page" aria-labelledby="terms-title">
      <h2 id="terms-title" className="static-page_title">
        Terms
      </h2>
      {/* <ol className="terms-list">
        {terms.map((line) => (
          <li key={line}>
            <p>{line}</p>
          </li>
        ))}
      </ol> */}
    </section>
  );
}

function HomePage({ backendStatus }: { backendStatus: 'checking' | 'ok' | 'degraded' | 'unreachable' }) {
  const [sourceSlots, setSourceSlots] = useState<MergeSourceSlot[]>(() => [createSourceSlot(), createSourceSlot()]);
  const [isLoading, setIsLoading] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<string | null>(null);
  const [mergedOutput, setMergedOutput] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<UiWarning[]>([]);
  const { toasts, pushToast, dismissToast } = useToastQueue();

  const updateSlot = useCallback((slotId: string, updater: (slot: MergeSourceSlot) => MergeSourceSlot) => {
    setSourceSlots((prev) => prev.map((slot) => (slot.id === slotId ? updater(slot) : slot)));
  }, []);

  const handleAddSlot = useCallback(() => {
    setSourceSlots((prev) => [...prev, createSourceSlot()]);
  }, []);

  const handleRemoveSlot = useCallback((slotId: string) => {
    setSourceSlots((prev) => {
      if (prev.length <= MIN_SOURCE_SLOTS) {
        return prev;
      }

      return prev.filter((slot) => slot.id !== slotId);
    });
  }, []);

  const handleModeChange = useCallback(
    (slotId: string, mode: MergeSourceMode) => {
      updateSlot(slotId, (slot) => ({
        ...slot,
        mode,
        file: null,
        pasteValue: '',
        fetchedValue: '',
      }));
    },
    [updateSlot],
  );

  const fetchRemoteValue = useCallback(async (slot: MergeSourceSlot): Promise<string> => {
    const url = slot.mode === 'github' ? normalizeGithubRawUrl(slot.remoteUrl) : slot.remoteUrl.trim();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    return response.text();
  }, []);

  const handleFetchRemote = useCallback(
    async (slotId: string) => {
      const slot = sourceSlots.find((entry) => entry.id === slotId);
      if (!slot) {
        return;
      }

      if (slot.mode !== 'github' && slot.mode !== 'url') {
        return;
      }

      if (!slot.remoteUrl.trim()) {
        pushToast('error', 'Enter a URL before fetching.');
        return;
      }

      try {
        const remoteText = await fetchRemoteValue(slot);
        const validation = validateOpenApiSpecChunk(remoteText);
        if (!validation.ok) {
          throw new Error(validation.message);
        }

        updateSlot(slot.id, (current) => ({ ...current, fetchedValue: remoteText }));
        pushToast('info', `Fetched and validated source from ${slot.mode === 'github' ? 'GitHub' : 'URL'}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch remote source.';
        pushToast('error', message);
      }
    },
    [fetchRemoteValue, pushToast, sourceSlots, updateSlot],
  );

  const buildMergePayload = useCallback(async () => {
    const files: File[] = [];
    const rawSpecs: string[] = [];

    for (let index = 0; index < sourceSlots.length; index += 1) {
      const slot = sourceSlots[index];
      const sourceNumber = index + 1;

      if (slot.mode === 'upload') {
        if (!slot.file) {
          pushToast('error', `Source ${sourceNumber}: select a file or change input mode.`);
          return null;
        }

        const fileContent = await slot.file.text();
        const fileValidation = validateOpenApiSpecChunk(fileContent);
        if (!fileValidation.ok) {
          pushToast('error', `Source ${sourceNumber}: ${fileValidation.message}`);
          return null;
        }

        files.push(slot.file);
        continue;
      }

      if (slot.mode === 'paste') {
        const pasted = slot.pasteValue.trim();
        if (!pasted) {
          pushToast('error', `Source ${sourceNumber}: paste OpenAPI JSON content.`);
          return null;
        }

        const pasteValidation = validateOpenApiSpecChunk(pasted);
        if (!pasteValidation.ok) {
          pushToast('error', `Source ${sourceNumber}: ${pasteValidation.message}`);
          return null;
        }

        rawSpecs.push(pasted);
        continue;
      }

      if (!slot.remoteUrl.trim()) {
        pushToast('error', `Source ${sourceNumber}: enter a ${slot.mode === 'github' ? 'GitHub' : 'remote'} URL.`);
        return null;
      }

      let remoteValue = slot.fetchedValue;
      if (!remoteValue) {
        try {
          remoteValue = await fetchRemoteValue(slot);
          updateSlot(slot.id, (current) => ({ ...current, fetchedValue: remoteValue }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch remote source.';
          pushToast('error', `Source ${sourceNumber}: ${message}`);
          return null;
        }
      }

      const remoteValidation = validateOpenApiSpecChunk(remoteValue);
      if (!remoteValidation.ok) {
        pushToast('error', `Source ${sourceNumber}: ${remoteValidation.message}`);
        return null;
      }

      rawSpecs.push(remoteValue);
    }

    return { files, rawSpecs };
  }, [fetchRemoteValue, pushToast, sourceSlots, updateSlot]);

  const handleMerge = useCallback(async () => {
    const payload = await buildMergePayload();
    if (!payload) {
      return;
    }

    setIsLoading(true);
    setMergeProgress('Validating documents...');
    setMergedOutput(null);

    // Simulate progress steps
    const timers = MERGE_PROGRESS_STEPS.map((step) =>
      window.setTimeout(() => setMergeProgress(step.message), step.delay),
    );

    try {
      const result = await mergeOpenApiSpecs(payload);

      setWarnings(result.warnings);
      setMergedOutput(JSON.stringify(result.merged, null, 2));
      setMergeProgress(null);
      pushToast('info', `Merged ${result.summary.sourceCount} source document(s).`);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? `${error.message}${Array.isArray(error.details) ? ' See validation details in backend response.' : ''}`
          : error instanceof Error
            ? error.message
            : 'Merge request failed.';
      pushToast('error', message);
      setMergeProgress(null);
    } finally {
      setIsLoading(false);
      timers.forEach((timer) => window.clearTimeout(timer));
    }
  }, [buildMergePayload]);

  const handleCopy = useCallback(async () => {
    if (!mergedOutput) {
      return;
    }

    try {
      await navigator.clipboard.writeText(mergedOutput);
      pushToast('info', 'Merged JSON copied to clipboard.');
    } catch {
      pushToast('error', 'Clipboard write failed. Copy manually from preview.');
    }
  }, [mergedOutput]);

  const handleDownload = useCallback(() => {
    if (!mergedOutput) {
      return;
    }

    const blob = new Blob([mergedOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'merged-openapi.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [mergedOutput]);

  const handleClearAll = useCallback(() => {
    setSourceSlots([createSourceSlot(), createSourceSlot()]);
    setMergedOutput(null);
    setWarnings([]);
    setMergeProgress(null);
    pushToast('info', 'Cleared all inputs and outputs.');
  }, []);

  // Keyboard shortcuts
  const hotkeys = useMemo(
    () => [
      {
        key: 'c',
        ctrlKey: true,
        handler: () => {
          if (mergedOutput && !window.getSelection()?.toString()) {
            void handleCopy();
          }
        },
      },
      {
        key: 'k',
        ctrlKey: true,
        handler: () => {
          handleClearAll();
        },
      },
    ],
    [handleCopy, handleClearAll, mergedOutput],
  );

  useHotkeys(hotkeys, true);

  return (
    <main className="app-main">
      <section className="dashboard-grid" aria-label="OpenAPI merger workspace">
        <MergeSourcesPanel
          slots={sourceSlots}
          minSlots={MIN_SOURCE_SLOTS}
          isLoading={isLoading}
          onAddSlot={handleAddSlot}
          onRemoveSlot={handleRemoveSlot}
          onModeChange={handleModeChange}
          onPasteChange={(slotId, value) => {
            updateSlot(slotId, (slot) => ({ ...slot, pasteValue: value }));
          }}
          onUrlChange={(slotId, value) => {
            updateSlot(slotId, (slot) => ({ ...slot, remoteUrl: value, fetchedValue: '' }));
          }}
          onFileChange={(slotId, file) => {
            updateSlot(slotId, (slot) => ({ ...slot, file }));
          }}
          onFetchRemote={(slotId) => {
            void handleFetchRemote(slotId);
          }}
        />

        <ResultPreviewPanel
          isLoading={isLoading}
          mergeProgress={mergeProgress}
          mergedOutput={mergedOutput}
          warnings={warnings}
          onMerge={() => {
            if (backendStatus === 'unreachable') {
              pushToast('error', 'Backend is offline. Start the backend service and try again.');
              return;
            }
            void handleMerge();
          }}
          onCopy={() => {
            void handleCopy();
          }}
          onDownload={handleDownload}
        />
      </section>

      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));
  const backendStatus = useBackendHealth();

  useEffect(() => {
    const onPopState = () => setRoute(normalizeRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">OpenAPI JSON Merger</h1>
          <span className={`status-badge status-badge--${backendStatus}`}>{STATUS_LABEL[backendStatus]}</span>
        </div>
        <p className="app-subtitle">Upload, paste, merge, preview, copy, and download OpenAPI specs</p>
        <HeaderNav route={route} onNavigate={navigateTo} />
      </header>

      {route === '/' ? <HomePage backendStatus={backendStatus} /> : null}
      {route === '/faq' ? <FaqPage /> : null}
      {route === '/terms' ? <TermsPage /> : null}

      <FooterNav onNavigate={navigateTo} />
    </div>
  );
}
