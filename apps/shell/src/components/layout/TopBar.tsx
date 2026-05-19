import React from 'react';
import { Button } from '@platform/ui';
import { useAuthStore } from '../../store/auth.js';
import { apiRequest } from '../../lib/api.js';

export function TopBar(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleLogout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', { method: 'POST', token: accessToken });
    } catch {
      // Ignore API errors — clear local auth regardless
    } finally {
      clearAuth();
    }
  }

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-gray-900 border-b border-gray-800 shrink-0">
      <span className="text-sm font-medium text-gray-200">Developer Platform</span>
      <div className="flex items-center gap-3">
        {user !== null && (
          <span className="text-xs text-gray-400">{user.displayName}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void handleLogout();
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
