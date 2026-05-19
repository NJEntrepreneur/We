import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@platform/types';
import { createEventBus, type EventBus } from '../index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

let bus: EventBus;

beforeEach(() => {
  bus = createEventBus();
});

// ── Factory ───────────────────────────────────────────────────────────────────

describe('createEventBus()', () => {
  it('returns an object with on / off / emit / once', () => {
    expect(typeof bus.on).toBe('function');
    expect(typeof bus.off).toBe('function');
    expect(typeof bus.emit).toBe('function');
    expect(typeof bus.once).toBe('function');
  });

  it('returns independent instances — events on one do not reach the other', () => {
    const busA = createEventBus();
    const busB = createEventBus();
    const handler = vi.fn();

    busB.on('exec.timeout', handler);
    busA.emit('exec.timeout', { executionId: 'e1' });

    expect(handler).not.toHaveBeenCalled();
  });
});

// ── Core bus mechanics ────────────────────────────────────────────────────────

describe('on() / emit()', () => {
  it('delivers the exact payload to the handler', () => {
    const handler = vi.fn();
    bus.on('exec.timeout', handler);
    bus.emit('exec.timeout', { executionId: 'exec-99' });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ executionId: 'exec-99' });
  });

  it('delivers to multiple handlers registered on the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('auth.session.started', h1);
    bus.on('auth.session.started', h2);
    bus.emit('auth.session.started', { userId: 'u-1' });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not deliver to handlers of a different event type', () => {
    const handler = vi.fn();
    bus.on('auth.session.started', handler);
    bus.emit('auth.session.expired', { userId: 'u-1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('delivers multiple sequential emits to the same handler', () => {
    const handler = vi.fn();
    bus.on('exec.timeout', handler);
    bus.emit('exec.timeout', { executionId: 'a' });
    bus.emit('exec.timeout', { executionId: 'b' });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('off()', () => {
  it('stops delivery after unsubscribing', () => {
    const handler = vi.fn();
    bus.on('exec.timeout', handler);
    bus.off('exec.timeout', handler);
    bus.emit('exec.timeout', { executionId: 'e1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('only removes the specified handler, leaving others intact', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('auth.session.expired', h1);
    bus.on('auth.session.expired', h2);
    bus.off('auth.session.expired', h1);
    bus.emit('auth.session.expired', { userId: 'u-1' });
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('is a no-op when the handler was never registered', () => {
    const handler = vi.fn();
    expect(() => bus.off('exec.timeout', handler)).not.toThrow();
  });
});

describe('once()', () => {
  it('fires on the first emit and not on subsequent ones', () => {
    const handler = vi.fn();
    bus.once('exec.timeout', handler);
    bus.emit('exec.timeout', { executionId: 'first' });
    bus.emit('exec.timeout', { executionId: 'second' });
    bus.emit('exec.timeout', { executionId: 'third' });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ executionId: 'first' });
  });

  it('delivers the correct payload on the one call', () => {
    const received: string[] = [];
    bus.once('plugin.error', ({ pluginId }) => {
      received.push(pluginId);
    });
    bus.emit('plugin.error', { pluginId: 'com.example.plugin', error: 'crash' });
    expect(received).toEqual(['com.example.plugin']);
  });

  it('regular on() handlers are unaffected by a once() on the same event', () => {
    const alwaysHandler = vi.fn();
    const onceHandler = vi.fn();
    bus.on('exec.timeout', alwaysHandler);
    bus.once('exec.timeout', onceHandler);
    bus.emit('exec.timeout', { executionId: 'e1' });
    bus.emit('exec.timeout', { executionId: 'e2' });
    expect(alwaysHandler).toHaveBeenCalledTimes(2);
    expect(onceHandler).toHaveBeenCalledOnce();
  });
});

// ── Editor events ─────────────────────────────────────────────────────────────

describe('editor events', () => {
  it('editor.file.opened carries filePath and workspaceId', () => {
    const handler = vi.fn();
    bus.on('editor.file.opened', handler);
    bus.emit('editor.file.opened', { filePath: '/src/app.ts', workspaceId: 'ws-1' });
    expect(handler).toHaveBeenCalledWith({ filePath: '/src/app.ts', workspaceId: 'ws-1' });
  });

  it('editor.file.saved carries filePath and workspaceId', () => {
    const handler = vi.fn();
    bus.on('editor.file.saved', handler);
    bus.emit('editor.file.saved', { filePath: '/src/app.ts', workspaceId: 'ws-1' });
    expect(handler).toHaveBeenCalledWith({ filePath: '/src/app.ts', workspaceId: 'ws-1' });
  });

  it('editor.file.closed carries only filePath', () => {
    const handler = vi.fn();
    bus.on('editor.file.closed', handler);
    bus.emit('editor.file.closed', { filePath: '/src/app.ts' });
    expect(handler).toHaveBeenCalledWith({ filePath: '/src/app.ts' });
  });
});

// ── Plugin events ─────────────────────────────────────────────────────────────

describe('plugin events', () => {
  it('plugin.activated carries pluginId and version', () => {
    const handler = vi.fn();
    bus.on('plugin.activated', handler);
    bus.emit('plugin.activated', { pluginId: 'com.acme.linter', version: '2.1.0' });
    expect(handler).toHaveBeenCalledWith({ pluginId: 'com.acme.linter', version: '2.1.0' });
  });

  it('plugin.deactivated carries pluginId and reason', () => {
    const handler = vi.fn();
    bus.on('plugin.deactivated', handler);
    bus.emit('plugin.deactivated', { pluginId: 'com.acme.linter', reason: 'user-request' });
    expect(handler).toHaveBeenCalledWith({ pluginId: 'com.acme.linter', reason: 'user-request' });
  });

  it('plugin.error carries pluginId and error', () => {
    const handler = vi.fn();
    bus.on('plugin.error', handler);
    bus.emit('plugin.error', { pluginId: 'com.acme.linter', error: 'ReferenceError: x is not defined' });
    expect(handler).toHaveBeenCalledWith({
      pluginId: 'com.acme.linter',
      error: 'ReferenceError: x is not defined',
    });
  });
});

// ── Workspace events ──────────────────────────────────────────────────────────

describe('workspace events', () => {
  it('workspace.opened carries workspaceId', () => {
    const handler = vi.fn();
    bus.on('workspace.opened', handler);
    bus.emit('workspace.opened', { workspaceId: 'ws-42' });
    expect(handler).toHaveBeenCalledWith({ workspaceId: 'ws-42' });
  });

  it('workspace.closed carries workspaceId', () => {
    const handler = vi.fn();
    bus.on('workspace.closed', handler);
    bus.emit('workspace.closed', { workspaceId: 'ws-42' });
    expect(handler).toHaveBeenCalledWith({ workspaceId: 'ws-42' });
  });

  it('workspace.member.added carries workspaceId, userId, and a typed Role', () => {
    const handler = vi.fn();
    bus.on('workspace.member.added', handler);
    bus.emit('workspace.member.added', {
      workspaceId: 'ws-42',
      userId: 'u-7',
      role: Role.Developer,
    });
    expect(handler).toHaveBeenCalledWith({
      workspaceId: 'ws-42',
      userId: 'u-7',
      role: 'developer',
    });
  });

  it('workspace.member.added accepts all valid Role values', () => {
    const roles = [
      Role.Owner,
      Role.Admin,
      Role.Developer,
      Role.Viewer,
      Role.Plugin,
    ] as const;

    for (const role of roles) {
      const handler = vi.fn();
      bus.on('workspace.member.added', handler);
      bus.emit('workspace.member.added', { workspaceId: 'ws-1', userId: 'u-1', role });
      expect(handler).toHaveBeenCalledWith({ workspaceId: 'ws-1', userId: 'u-1', role });
      bus.off('workspace.member.added', handler);
    }
  });
});

// ── Auth events ───────────────────────────────────────────────────────────────

describe('auth events', () => {
  it('auth.session.started carries userId', () => {
    const handler = vi.fn();
    bus.on('auth.session.started', handler);
    bus.emit('auth.session.started', { userId: 'u-1' });
    expect(handler).toHaveBeenCalledWith({ userId: 'u-1' });
  });

  it('auth.session.expired carries userId', () => {
    const handler = vi.fn();
    bus.on('auth.session.expired', handler);
    bus.emit('auth.session.expired', { userId: 'u-1' });
    expect(handler).toHaveBeenCalledWith({ userId: 'u-1' });
  });

  it('auth.token.refreshed carries userId', () => {
    const handler = vi.fn();
    bus.on('auth.token.refreshed', handler);
    bus.emit('auth.token.refreshed', { userId: 'u-1' });
    expect(handler).toHaveBeenCalledWith({ userId: 'u-1' });
  });
});

// ── Exec events ───────────────────────────────────────────────────────────────

describe('exec events', () => {
  it('exec.started carries executionId and language', () => {
    const handler = vi.fn();
    bus.on('exec.started', handler);
    bus.emit('exec.started', { executionId: 'run-1', language: 'typescript' });
    expect(handler).toHaveBeenCalledWith({ executionId: 'run-1', language: 'typescript' });
  });

  it('exec.completed carries executionId, exitCode, and durationMs', () => {
    const handler = vi.fn();
    bus.on('exec.completed', handler);
    bus.emit('exec.completed', { executionId: 'run-1', exitCode: 0, durationMs: 312 });
    expect(handler).toHaveBeenCalledWith({ executionId: 'run-1', exitCode: 0, durationMs: 312 });
  });

  it('exec.timeout carries executionId', () => {
    const handler = vi.fn();
    bus.on('exec.timeout', handler);
    bus.emit('exec.timeout', { executionId: 'run-1' });
    expect(handler).toHaveBeenCalledWith({ executionId: 'run-1' });
  });

  it('exec.completed with non-zero exit code', () => {
    const handler = vi.fn();
    bus.on('exec.completed', handler);
    bus.emit('exec.completed', { executionId: 'run-2', exitCode: 1, durationMs: 50 });
    expect(handler).toHaveBeenCalledWith({ executionId: 'run-2', exitCode: 1, durationMs: 50 });
  });
});
