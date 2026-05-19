import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSilentRefresh } from '../../hooks/useSilentRefresh.js';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';

export function AppLayout(): React.ReactElement {
  useSilentRefresh();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
