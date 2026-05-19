import { Role } from '../enums/roles';

export interface EventMap {
  // Editor
  'editor.file.opened':     { filePath: string; workspaceId: string };
  'editor.file.saved':      { filePath: string; workspaceId: string };
  'editor.file.closed':     { filePath: string };

  // Plugin lifecycle
  'plugin.activated':       { pluginId: string; version: string };
  'plugin.deactivated':     { pluginId: string; reason: string };
  'plugin.error':           { pluginId: string; error: string };

  // Workspace
  'workspace.opened':       { workspaceId: string };
  'workspace.closed':       { workspaceId: string };
  'workspace.member.added': { workspaceId: string; userId: string; role: Role };

  // Auth
  'auth.session.started':   { userId: string };
  'auth.session.expired':   { userId: string };
  'auth.token.refreshed':   { userId: string };

  // Execution
  'exec.started':           { executionId: string; language: string };
  'exec.completed':         { executionId: string; exitCode: number; durationMs: number };
  'exec.timeout':           { executionId: string };
}
