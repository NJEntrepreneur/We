// Enums
export { Role } from './enums/roles.js';

// Schemas + inferred types — one export per schema file
export {
  RoleSchema,
} from './schemas/roles.js';

export {
  PluginPermissionSchema,
  PluginManifestSchema,
  type PluginPermission,
  type CommandContribution,
  type PanelContribution,
  type ThemeContribution,
  type LanguageProviderContribution,
  type PluginContributes,
  type PluginManifest,
} from './schemas/plugin-manifest.js';

export {
  PluginRPCErrorSchema,
  PluginRPCRequestSchema,
  PluginRPCResponseSchema,
  PluginRPCMessageSchema,
  type PluginRPCError,
  type PluginRPCRequest,
  type PluginRPCResponse,
  type PluginRPCMessage,
} from './schemas/plugin-rpc.js';

export {
  AccessTokenPayloadSchema,
  RefreshTokenPayloadSchema,
  PluginTokenPayloadSchema,
  CsrfTokenSchema,
  type AccessTokenPayload,
  type RefreshTokenPayload,
  type PluginTokenPayload,
  type CsrfToken,
} from './schemas/auth-tokens.js';

export {
  EditorViewStateSchema,
  PanelLayoutSchema,
  WorkspaceSettingsSchema,
  WorkspaceSnapshotSchema,
  type EditorViewState,
  type PanelLayout,
  type WorkspaceSettings,
  type WorkspaceSnapshot,
} from './schemas/workspace-snapshot.js';

export {
  ExecutionRequestSchema,
  ExecutionResultSchema,
  type ExecutionRequest,
  type ExecutionResult,
} from './schemas/execution.js';

export {
  AuditEntrySchema,
  type AuditEntry,
} from './schemas/audit.js';

export {
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthUserSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
  type RegisterRequest,
  type LoginRequest,
  type AuthUser,
  type AuthResponse,
  type RefreshResponse,
} from './schemas/auth-requests.js';
