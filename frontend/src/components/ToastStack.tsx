import { memo, useCallback } from 'react';
import type { ToastItem } from '../types/app';

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

function ToastStackContent({ toasts, onDismiss }: ToastStackProps) {
  const handleDismiss = useCallback(
    (id: number) => {
      onDismiss(id);
    },
    [onDismiss],
  );

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`} role="alert">
          <p>{toast.message}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => handleDismiss(toast.id)}
            aria-label={`Dismiss ${toast.kind} message`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export const ToastStack = memo(ToastStackContent, (prev, next) => prev.toasts.length === next.toasts.length);
