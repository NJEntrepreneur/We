import mitt from 'mitt';
import type { Role } from '@platform/types';

// ── Event map ─────────────────────────────────────────────────────────────────
// §11: <domain>.<entity>.<verb> naming; every payload is an explicit object type.
// Add new events here — never use untyped emit('some-string', data).

export type PlatformEventMap = {
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
};

export type PlatformEventType = keyof PlatformEventMap;

export type PlatformEventHandler<K extends PlatformEventType> = (
  event: PlatformEventMap[K],
) => void;

// ── Public interface ──────────────────────────────────────────────────────────
// Wraps mitt and intentionally omits the '*' wildcard so every call site
// must name a concrete event key from PlatformEventMap.

export interface EventBus {
  /** Subscribe to an event. */
  on<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void;

  /** Unsubscribe a previously registered handler. */
  off<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void;

  /** Publish an event with its typed payload. */
  emit<K extends PlatformEventType>(type: K, event: PlatformEventMap[K]): void;

  /** Subscribe for exactly one delivery, then auto-unsubscribe. */
  once<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void;
}

// ── Factory ───────────────────────────────────────────────────────────────────
// No module-level singleton — callers own the lifecycle.

export function createEventBus(): EventBus {
  const emitter = mitt<PlatformEventMap>();

  return {
    on(type, handler) {
      emitter.on(type, handler);
    },

    off(type, handler) {
      emitter.off(type, handler);
    },

    emit(type, event) {
      emitter.emit(type, event);
    },

    once<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void {
      // 'done' guard prevents double-fire if an event is emitted synchronously
      // during handler execution before off() completes.
      let done = false;
      const wrapper: PlatformEventHandler<K> = (event) => {
        if (done) return;
        done = true;
        emitter.off(type, wrapper);
        handler(event);
      };
      emitter.on(type, wrapper);
    },
  };
}
