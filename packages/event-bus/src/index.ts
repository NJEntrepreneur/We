import type { Role } from '@platform/types';

// ── Event map ─────────────────────────────────────────────────────────────────
// §11: <domain>.<entity>.<verb> naming; every payload is an explicit object type.
// Add new events here — never use untyped emit('some-string', data).

export interface PlatformEventMap {
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

  // Collaboration
  'collab.user-joined':     { workspaceId: string; userId: string; clientId: string };
  'collab.user-left':       { workspaceId: string; userId: string; clientId: string };
  'collab.document-saved':  { workspaceId: string };
}

export type PlatformEventType = keyof PlatformEventMap;

export type PlatformEventHandler<K extends PlatformEventType> = (
  event: PlatformEventMap[K],
) => void;

// ── Internal handler store ────────────────────────────────────────────────────

type AnyHandler = (event: PlatformEventMap[PlatformEventType]) => void;

// ── Public interface ──────────────────────────────────────────────────────────

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
// Minimal typed pub/sub — no external dependency to avoid CJS/ESM interop
// issues with mitt under NodeNext module resolution in TS 5.9+.

export function createEventBus(): EventBus {
  const all = new Map<string, AnyHandler[]>();

  return {
    on<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void {
      const list = all.get(type);
      if (list !== undefined) {
        list.push(handler as AnyHandler);
      } else {
        all.set(type, [handler as AnyHandler]);
      }
    },

    off<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void {
      const list = all.get(type);
      if (list === undefined) return;
      const idx = list.indexOf(handler as AnyHandler);
      if (idx !== -1) list.splice(idx, 1);
    },

    emit<K extends PlatformEventType>(type: K, event: PlatformEventMap[K]): void {
      const list = all.get(type);
      if (list === undefined) return;
      for (const h of list.slice()) {
        h(event as PlatformEventMap[PlatformEventType]);
      }
    },

    once<K extends PlatformEventType>(type: K, handler: PlatformEventHandler<K>): void {
      // 'done' guard prevents double-fire if an event is emitted synchronously
      // during handler execution before off() completes.
      let done = false;
      const wrapper: PlatformEventHandler<K> = (event) => {
        if (done) return;
        done = true;
        this.off(type, wrapper);
        handler(event);
      };
      this.on(type, wrapper);
    },
  };
}
