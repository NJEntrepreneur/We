import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/auth.js';
import { Role } from '@platform/types';
import type { AuthUser } from '@platform/types';

const mockUser: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  displayName: 'Test User',
  role: Role.Developer,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('starts with null token and user', () => {
    const { accessToken, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(user).toBeNull();
  });

  it('setAuth stores both token and user', () => {
    useAuthStore.getState().setAuth('tok-abc', mockUser);
    const { accessToken, user } = useAuthStore.getState();
    expect(accessToken).toBe('tok-abc');
    expect(user).toEqual(mockUser);
  });

  it('clearAuth resets token and user to null', () => {
    useAuthStore.getState().setAuth('tok-abc', mockUser);
    useAuthStore.getState().clearAuth();
    const { accessToken, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(user).toBeNull();
  });

  it('setAccessToken updates token without touching user', () => {
    useAuthStore.getState().setAuth('old-tok', mockUser);
    useAuthStore.getState().setAccessToken('new-tok');
    const { accessToken, user } = useAuthStore.getState();
    expect(accessToken).toBe('new-tok');
    expect(user).toEqual(mockUser);
  });

  it('multiple setAuth calls overwrite previous values', () => {
    const otherUser: AuthUser = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'other@example.com',
      displayName: 'Other User',
      role: Role.Viewer,
    };
    useAuthStore.getState().setAuth('tok-1', mockUser);
    useAuthStore.getState().setAuth('tok-2', otherUser);
    const { accessToken, user } = useAuthStore.getState();
    expect(accessToken).toBe('tok-2');
    expect(user).toEqual(otherUser);
  });
});
