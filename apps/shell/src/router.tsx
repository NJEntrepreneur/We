import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.js';
import { RequireAuth } from './components/layout/RequireAuth.js';
import { EditorPage } from './pages/EditorPage.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/editor/:workspaceId', element: <EditorPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
