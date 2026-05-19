import { create } from 'zustand';
import type { AuthUser } from '@platform/types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
}

interface AuthActions {
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setAccessToken: (token: string) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setAccessToken: (accessToken) => set({ accessToken }),
}));
