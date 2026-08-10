'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function useSessionKeepalive() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const pingRefresh = async () => {
      if (document.hidden) return; // Don't ping if tab is in background
      try {
        await fetch('/api/proxy/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        /* silent catch */
      }
    };

    const interval = setInterval(pingRefresh, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated]);
}
