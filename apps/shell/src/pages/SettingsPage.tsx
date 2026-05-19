import React from 'react';
import { useAuthStore } from '../store/auth.js';

export function SettingsPage(): React.ReactElement {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-100 mb-6">Settings</h1>
      {user !== null && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
            Account
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-400">Email</dt>
              <dd className="text-gray-100">{user.email}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-400">Display name</dt>
              <dd className="text-gray-100">{user.displayName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-400">Role</dt>
              <dd className="text-gray-100 capitalize">{user.role}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
