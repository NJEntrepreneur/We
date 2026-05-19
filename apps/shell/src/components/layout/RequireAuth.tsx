import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.js';

interface RequireAuthProps {
  children: React.ReactElement;
}

export function RequireAuth({ children }: RequireAuthProps): React.ReactElement {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  if (accessToken === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
