import { useEffect, useState } from 'react';

import type { BackendStatus } from '../types/app';
import { checkBackendHealth } from '../services/api';

export function useBackendHealth(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let active = true;

    const runCheck = async () => {
      const ok = await checkBackendHealth();
      if (active) {
        setStatus(ok ? 'ok' : 'unreachable');
      }
    };

    void runCheck();
    const timer = window.setInterval(() => {
      void runCheck();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return status;
}
