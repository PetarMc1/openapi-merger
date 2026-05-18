import type { AppRoute, BackendStatus } from '../types/app';

export const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Backend: checking…',
  ok: 'Backend: online',
  degraded: 'Backend: degraded',
  unreachable: 'Backend: offline',
};

export const APP_ROUTES: readonly AppRoute[] = ['/', '/faq', '/terms'];

export const TOAST_DURATION_MS = 6000;

export const MERGE_PROGRESS_STEPS: ReadonlyArray<{ delay: number; message: string }> = [
  { delay: 200, message: 'Merging paths...' },
  { delay: 450, message: 'Merging components...' },
  { delay: 700, message: 'Detecting conflicts...' },
  { delay: 950, message: 'Finalizing...' },
];
