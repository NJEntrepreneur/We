import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.js';

export function App(): React.ReactElement {
  return <RouterProvider router={router} />;
}
