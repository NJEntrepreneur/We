import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { LoginRequestSchema, AuthResponseSchema, type LoginRequest } from '@platform/types';
import { Button, Input } from '@platform/ui';
import { useAuthStore } from '../store/auth.js';
import { apiRequest, ApiError } from '../lib/api.js';

const FromStateSchema = z.object({ from: z.object({ pathname: z.string() }) });

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const fromResult = FromStateSchema.safeParse(location.state);
  const from = fromResult.success ? fromResult.data.from.pathname : '/';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
  });

  async function onSubmit(data: LoginRequest): Promise<void> {
    try {
      const raw = await apiRequest('/auth/login', {
        method: 'POST',
        body: data,
      });
      const { accessToken, user } = AuthResponseSchema.parse(raw);
      setAuth(accessToken, user);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Invalid email or password'
          : 'Something went wrong. Please try again.';
      setError('root', { message });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl border border-gray-800 p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Sign in</h1>
          <p className="text-sm text-gray-400 mt-1">to Developer Platform</p>
        </div>
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {errors.root !== undefined && (
            <p role="alert" className="text-sm text-red-400">
              {errors.root.message}
            </p>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
