import { z } from 'zod';
import { RoleSchema } from './roles.js';
import { PluginPermissionSchema } from './plugin-manifest.js';

// Standard JWT numeric claims (seconds since epoch)
const JwtNumericDateSchema = z.number().int().positive();

// §6: payload inside the 15-minute access JWT (stored in memory only)
export const AccessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),       // userId
  jti: z.string().uuid(),       // unique token id — used for revocation checks
  role: RoleSchema,
  iat: JwtNumericDateSchema,
  exp: JwtNumericDateSchema,
});
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;

// §6: payload inside the 7-day refresh JWT (httpOnly cookie, never in memory)
// familyId links tokens in one rotation chain; reuse of a revoked token
// invalidates the entire family.
export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),       // userId
  jti: z.string().uuid(),       // unique token id
  familyId: z.string().uuid(),  // rotation family — invalidated on token reuse
  iat: JwtNumericDateSchema,
  exp: JwtNumericDateSchema,
});
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

// §5 + §6: short-lived plugin-scoped token (1 hour, memory inside iframe)
// Carries only the permissions declared in the manifest — not the user's JWT.
export const PluginTokenPayloadSchema = z.object({
  sub: z.string(),              // pluginId
  jti: z.string().uuid(),
  pluginId: z.string().regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+$/),
  workspaceId: z.string().uuid(),
  permissions: z.array(PluginPermissionSchema).max(9),
  iat: JwtNumericDateSchema,
  exp: JwtNumericDateSchema,
});
export type PluginTokenPayload = z.infer<typeof PluginTokenPayloadSchema>;

// §6: CSRF token stored in sessionStorage, used for cookie-authenticated mutations
export const CsrfTokenSchema = z.string().min(32).max(256);
export type CsrfToken = z.infer<typeof CsrfTokenSchema>;
