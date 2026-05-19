import React from 'react';
import { useAuthStore } from '../store/auth.js';

export function HomePage(): React.ReactElement {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">
        Welcome{user !== null ? `, ${user.displayName}` : ''}
      </h1>
      <p className="text-gray-400">Select or create a workspace to get started.</p>
    </div>
  );
}
