import { useEffect, useRef } from 'react';
import { RefreshResponseSchema } from '@platform/types';
import { useAuthStore } from '../store/auth.js';
import { apiRequest } from '../lib/api.js';

const REFRESH_BUFFER_MS = 60 * 1000; // refresh 60 s before expiry

function parseTokenExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const segment = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(segment)) as Record<string, unknown>;
    return typeof json['exp'] === 'number' ? json['exp'] : null;
  } catch {
    return null;
  }
}

export function useSilentRefresh(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (accessToken === null) return;

    const exp = parseTokenExp(accessToken);
    if (exp === null) return;

    const expiresInMs = exp * 1000 - Date.now();
    const refreshInMs = Math.max(expiresInMs - REFRESH_BUFFER_MS, 0);

    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const raw = await apiRequest<unknown>('/auth/refresh', {
            method: 'POST',
            token: accessToken,
          });
          const { accessToken: newToken } = RefreshResponseSchema.parse(raw);
          setAccessToken(newToken);
        } catch {
          clearAuth();
        }
      })();
    }, refreshInMs);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [accessToken, setAccessToken, clearAuth]);
}
