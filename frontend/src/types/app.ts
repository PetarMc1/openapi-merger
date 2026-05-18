import type { MergeResponse, MergeWarning, OpenApiDocument } from 'shared/schemas';

export type AppRoute = '/' | '/faq' | '/terms';

export type BackendStatus = 'checking' | 'ok' | 'degraded' | 'unreachable';

export type UploadedSpec = {
  id: string;
  name: string;
  content: string;
  size: number;
};

export type MergeResult = MergeResponse;

export type UiWarning = MergeWarning;

export type ParsedDocument = OpenApiDocument;

export type ToastItem = {
  id: number;
  kind: 'error' | 'info';
  message: string;
};

export type MergeSourceMode = 'upload' | 'paste' | 'github' | 'url';

export type MergeSourceSlot = {
  id: string;
  mode: MergeSourceMode;
  file: File | null;
  pasteValue: string;
  remoteUrl: string;
  fetchedValue: string;
};
