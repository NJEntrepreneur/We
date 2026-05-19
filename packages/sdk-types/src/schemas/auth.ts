import { z } from 'zod';
import { RoleSchema } from '../enums/roles';
import { PluginPermissionSchema } from './plugin-manifest';

export const AccessTokenClaimsSchema = z.object({
  sub:         z.string().uuid(),
  role:        RoleSchema,
  workspaceId: z.string().uuid().optional(),
  iat:         z.number().int(),
  exp:         z.number().int(),
  jti:         z.string().uuid(),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;

export const PluginTokenClaimsSchema = z.object({
  sub:         z.string().min(1),
  workspaceId: z.string().uuid(),
  permissions: z.array(PluginPermissionSchema),
  iat:         z.number().int(),
  exp:         z.number().int(),
  jti:         z.string().uuid(),
});
export type PluginTokenClaims = z.infer<typeof PluginTokenClaimsSchema>;

export const RefreshTokenPayloadSchema = z.object({
  userId:    z.string().uuid(),
  familyId:  z.string().uuid(),
  tokenId:   z.string().uuid(),
  issuedAt:  z.number().int(),
  expiresAt: z.number().int(),
});
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

export const CsrfTokenSchema = z.object({
  value:     z.string().min(32),
  sessionId: z.string().min(1),
  createdAt: z.number().int(),
});
export type CsrfToken = z.infer<typeof CsrfTokenSchema>;

export const OAuthProviderSchema = z.enum(['github', 'gitlab', 'google']);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;
