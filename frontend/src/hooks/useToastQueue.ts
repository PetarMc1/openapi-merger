import { useCallback, useState } from 'react';

import { TOAST_DURATION_MS } from '../constants/app';
import type { ToastItem } from '../types/app';

export function useToastQueue() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, kind, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
