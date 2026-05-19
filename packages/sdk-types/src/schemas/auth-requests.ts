import { z } from 'zod';
import { RoleSchema } from './roles.js';

export const RegisterRequestSchema = z.object({
  email:       z.string().email(),
  password:    z.string().min(8).max(128),
  displayName: z.string().min(1).max(100),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id:          z.string().uuid(),
  email:       z.string().email(),
  displayName: z.string(),
  role:        RoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user:        AuthUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
