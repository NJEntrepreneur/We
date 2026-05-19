import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from '../pages/LoginPage.js';
import { useAuthStore } from '../store/auth.js';

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

import { apiRequest, ApiError } from '../lib/api.js';
const mockApiRequest = vi.mocked(apiRequest);

function renderLogin(): void {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    mockApiRequest.mockReset();
  });

  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a Sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows email validation error when submitted empty', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows email validation error for malformed address', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'not-valid');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows "Invalid email or password" on 401', async () => {
    const user = userEvent.setup();
    mockApiRequest.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
  });

  it('shows generic error for non-401 failures', async () => {
    const user = userEvent.setup();
    mockApiRequest.mockRejectedValue(new ApiError(500, 'Server Error'));
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'somepass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    });
  });

  it('calls setAuth in the store on successful login', async () => {
    const user = userEvent.setup();
    mockApiRequest.mockResolvedValue({
      accessToken: 'tok-xyz',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        displayName: 'User',
        role: 'developer',
      },
    });
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correctpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('tok-xyz');
    });
  });

  it('does not store token before form is submitted', () => {
    renderLogin();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
