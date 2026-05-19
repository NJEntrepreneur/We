import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../store/auth.js';
import { useSilentRefresh } from '../hooks/useSilentRefresh.js';

vi.mock('../lib/api.js', () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

import { apiRequest } from '../lib/api.js';
const mockApiRequest = vi.mocked(apiRequest);

function makeJwt(expOffsetSeconds: number): string {
  const payload = {
    sub: '00000000-0000-0000-0000-000000000001',
    jti: '00000000-0000-0000-0000-000000000002',
    role: 'developer',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  };
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `header.${encoded}.sig`;
}

describe('useSilentRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({ accessToken: null, user: null });
    mockApiRequest.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when there is no access token', () => {
    renderHook(() => useSilentRefresh());
    vi.runAllTimers();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('does not call refresh before the refresh window', async () => {
    const token = makeJwt(900); // 15 min — refresh fires at 840 s
    useAuthStore.setState({ accessToken: token });
    mockApiRequest.mockResolvedValue({ accessToken: 'new-token' });

    renderHook(() => useSilentRefresh());

    await act(async () => {
      vi.advanceTimersByTime(839_000);
    });

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('calls /auth/refresh after the refresh window elapses', async () => {
    const token = makeJwt(900);
    useAuthStore.setState({ accessToken: token });
    mockApiRequest.mockResolvedValue({ accessToken: 'new-token' });

    renderHook(() => useSilentRefresh());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('updates access token in store on successful refresh', async () => {
    const token = makeJwt(61); // expires in 61 s — fires in 1 s
    useAuthStore.setState({ accessToken: token });
    mockApiRequest.mockResolvedValue({ accessToken: 'refreshed-token' });

    renderHook(() => useSilentRefresh());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(useAuthStore.getState().accessToken).toBe('refreshed-token');
  });

  it('clears auth when refresh request fails', async () => {
    const token = makeJwt(61);
    useAuthStore.setState({ accessToken: token });
    mockApiRequest.mockRejectedValue(new Error('network error'));

    renderHook(() => useSilentRefresh());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('clears the timer when the token is removed', async () => {
    const token = makeJwt(900);
    useAuthStore.setState({ accessToken: token });

    const { rerender } = renderHook(() => useSilentRefresh());

    act(() => {
      useAuthStore.getState().clearAuth();
    });
    rerender();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
