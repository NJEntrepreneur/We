import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { PermissionGate } from '../PermissionGate.js';
import { MessageBridge } from '../MessageBridge.js';
import { SandboxLoader } from '../SandboxLoader.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Creates a minimal fake Window that satisfies MessageEvent source comparison.
// Includes a no-op postMessage so the bridge can send responses without throwing.
function makeFakeWindow(): Window {
  const w = { postMessage: vi.fn() } as unknown as Window;
  return w;
}

function makePluginRequest(
  token: string,
  overrides: Record<string, unknown> = {},
): unknown {
  return {
    type: 'request',
    payload: {
      id:              crypto.randomUUID(),
      method:          'fs.read',
      params:          { path: '/foo.ts' },
      capabilityToken: token,
      ...overrides,
    },
  };
}

function makePluginResponse(id: string, result: unknown = { content: 'ok' }): unknown {
  return {
    type: 'response',
    payload: { id, result },
  };
}

// Dispatches a postMessage from the perspective of the plugin → host.
function dispatchFrom(source: Window, origin: string, data: unknown): void {
  window.dispatchEvent(
    new MessageEvent('message', { source, origin, data }),
  );
}

// ── PermissionGate ────────────────────────────────────────────────────────────

describe('PermissionGate', () => {
  it('allows a method that matches a declared permission exactly', () => {
    const gate = new PermissionGate(['fs.read', 'editor.commands']);
    expect(gate.isAllowed('fs.read')).toBe(true);
    expect(gate.isAllowed('editor.commands')).toBe(true);
  });

  it('allows a sub-method under a granted permission prefix', () => {
    const gate = new PermissionGate(['fs.read']);
    expect(gate.isAllowed('fs.read.specific')).toBe(true);
  });

  it('denies a method whose prefix permission is not granted', () => {
    const gate = new PermissionGate(['fs.read']);
    expect(gate.isAllowed('fs.write')).toBe(false);
    expect(gate.isAllowed('terminal.spawn')).toBe(false);
    expect(gate.isAllowed('network.fetch')).toBe(false);
  });

  it('denies methods with unknown prefixes (default-deny)', () => {
    const gate = new PermissionGate(['fs.read', 'fs.write', 'network.fetch',
      'terminal.spawn', 'editor.decorate', 'editor.commands',
      'ui.panel', 'settings.read', 'settings.write']);
    expect(gate.isAllowed('evil.method')).toBe(false);
    expect(gate.isAllowed('inject')).toBe(false);
    expect(gate.isAllowed('')).toBe(false);
  });

  it('grants no permissions with an empty permission list', () => {
    const gate = new PermissionGate([]);
    expect(gate.isAllowed('fs.read')).toBe(false);
    expect(gate.isAllowed('settings.write')).toBe(false);
  });

  it('reports has() correctly for each permission', () => {
    const gate = new PermissionGate(['fs.read', 'ui.panel']);
    expect(gate.has('fs.read')).toBe(true);
    expect(gate.has('ui.panel')).toBe(true);
    expect(gate.has('fs.write')).toBe(false);
  });

  it('returns granted permissions list', () => {
    const perms = ['fs.read', 'editor.commands'] as const;
    const gate = new PermissionGate([...perms]);
    expect(gate.granted()).toEqual(expect.arrayContaining([...perms]));
  });
});

// ── MessageBridge — origin verification ───────────────────────────────────────

describe('MessageBridge — origin verification', () => {
  const TOKEN = 'test-capability-token';
  let pluginWindow: Window;
  let gate: PermissionGate;
  let bridge: MessageBridge;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pluginWindow = makeFakeWindow();
    gate = new PermissionGate(['fs.read']);
    bridge = new MessageBridge(pluginWindow, TOKEN, gate, 'com.test.plugin');
    handler = vi.fn().mockResolvedValue({ content: 'file-data' });
    bridge.registerHandler('fs.read', handler);
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
    vi.clearAllMocks();
  });

  it('processes a request from the correct source with null origin', async () => {
    const data = makePluginRequest(TOKEN);
    dispatchFrom(pluginWindow, 'null', data);

    // Give the micro-task queue a tick to process
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignores a message from an unknown window (wrong source)', async () => {
    const stranger = makeFakeWindow();
    dispatchFrom(stranger, 'null', makePluginRequest(TOKEN));

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a message with a non-null origin even from the correct source', async () => {
    dispatchFrom(pluginWindow, 'https://evil.example.com', makePluginRequest(TOKEN));

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a message with origin http://localhost even from the correct source', async () => {
    dispatchFrom(pluginWindow, 'http://localhost:3000', makePluginRequest(TOKEN));

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores messages after bridge.stop()', async () => {
    bridge.stop();
    dispatchFrom(pluginWindow, 'null', makePluginRequest(TOKEN));

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores malformed messages silently', async () => {
    dispatchFrom(pluginWindow, 'null', { garbage: true });

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ── MessageBridge — permission gating ────────────────────────────────────────

describe('MessageBridge — permission gating', () => {
  const TOKEN = 'test-capability-token';
  let pluginWindow: Window;
  let bridge: MessageBridge;
  let postedMessages: unknown[];

  beforeEach(() => {
    pluginWindow = makeFakeWindow();
    // Capture messages sent back to the plugin
    postedMessages = [];
    pluginWindow.postMessage = vi.fn((data: unknown) => {
      postedMessages.push(data);
    });

    const gate = new PermissionGate(['fs.read']); // only fs.read granted
    bridge = new MessageBridge(pluginWindow, TOKEN, gate, 'com.test.plugin');
    bridge.registerHandler('fs.read', () => Promise.resolve({ content: 'data' }));
    bridge.registerHandler('fs.write', () => Promise.resolve({ ok: true }));
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
    vi.clearAllMocks();
  });

  it('responds with the handler result for an allowed method', async () => {
    const id = crypto.randomUUID();
    dispatchFrom(pluginWindow, 'null', {
      type: 'request',
      payload: { id, method: 'fs.read', params: {}, capabilityToken: TOKEN },
    });

    await new Promise<void>((r) => setTimeout(r, 0));
    const response = postedMessages.find((m) => {
      const msg = m as { type: string; payload: { id: string } };
      return msg.type === 'response' && msg.payload.id === id;
    }) as { type: string; payload: { id: string; result: unknown; error?: unknown } } | undefined;

    expect(response).toBeDefined();
    expect(response?.payload.error).toBeUndefined();
    expect(response?.payload.result).toEqual({ content: 'data' });
  });

  it('responds with PERMISSION_DENIED for a method not in granted permissions', async () => {
    const id = crypto.randomUUID();
    dispatchFrom(pluginWindow, 'null', {
      type: 'request',
      payload: { id, method: 'fs.write', params: {}, capabilityToken: TOKEN },
    });

    await new Promise<void>((r) => setTimeout(r, 0));
    const response = postedMessages.find((m) => {
      const msg = m as { type: string; payload: { id: string } };
      return msg.type === 'response' && msg.payload.id === id;
    }) as { type: string; payload: { id: string; error?: { code: string } } } | undefined;

    expect(response?.payload.error?.code).toBe('PERMISSION_DENIED');
  });

  it('responds with PERMISSION_DENIED for a completely unknown method', async () => {
    const id = crypto.randomUUID();
    dispatchFrom(pluginWindow, 'null', {
      type: 'request',
      payload: { id, method: 'evil.exfiltrate', params: {}, capabilityToken: TOKEN },
    });

    await new Promise<void>((r) => setTimeout(r, 0));
    const response = postedMessages.find((m) => {
      const msg = m as { type: string; payload: { id: string } };
      return msg.type === 'response' && msg.payload.id === id;
    }) as { type: string; payload: { id: string; error?: { code: string } } } | undefined;

    expect(response?.payload.error?.code).toBe('PERMISSION_DENIED');
  });

  it('responds with UNAUTHORIZED when the capability token is wrong', async () => {
    const id = crypto.randomUUID();
    dispatchFrom(pluginWindow, 'null', {
      type: 'request',
      payload: { id, method: 'fs.read', params: {}, capabilityToken: 'WRONG_TOKEN' },
    });

    await new Promise<void>((r) => setTimeout(r, 0));
    const response = postedMessages.find((m) => {
      const msg = m as { type: string; payload: { id: string } };
      return msg.type === 'response' && msg.payload.id === id;
    }) as { type: string; payload: { id: string; error?: { code: string } } } | undefined;

    expect(response?.payload.error?.code).toBe('UNAUTHORIZED');
  });

  it('responds with METHOD_NOT_FOUND for an allowed-prefix but unregistered method', async () => {
    // fs.read permission is granted but 'fs.read.special' handler isn't registered
    const id = crypto.randomUUID();
    dispatchFrom(pluginWindow, 'null', {
      type: 'request',
      payload: { id, method: 'fs.read.special', params: {}, capabilityToken: TOKEN },
    });

    await new Promise<void>((r) => setTimeout(r, 0));
    const response = postedMessages.find((m) => {
      const msg = m as { type: string; payload: { id: string } };
      return msg.type === 'response' && msg.payload.id === id;
    }) as { type: string; payload: { id: string; error?: { code: string } } } | undefined;

    expect(response?.payload.error?.code).toBe('METHOD_NOT_FOUND');
  });
});

// ── MessageBridge — RPC correlation ──────────────────────────────────────────

describe('MessageBridge — RPC correlation (host-initiated requests)', () => {
  const TOKEN = 'test-capability-token';
  let pluginWindow: Window;
  let sentToPlugin: unknown[];
  let bridge: MessageBridge;

  beforeEach(() => {
    pluginWindow = makeFakeWindow();
    sentToPlugin = [];
    pluginWindow.postMessage = vi.fn((data: unknown) => {
      sentToPlugin.push(data);
    });

    const gate = new PermissionGate([]);
    bridge = new MessageBridge(pluginWindow, TOKEN, gate, 'com.test.plugin');
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
    vi.clearAllMocks();
  });

  it('resolves with the result when the plugin responds with the matching request ID', async () => {
    const resultPromise = bridge.sendRequest('plugin.deactivate', { reason: 'test' });

    // Pull the request ID from what was sent to the plugin
    const sentMsg = sentToPlugin[0] as { type: string; payload: { id: string } };
    const requestId = sentMsg.payload.id;

    // Simulate the plugin responding
    dispatchFrom(pluginWindow, 'null', makePluginResponse(requestId, { acknowledged: true }));

    const result = await resultPromise;
    expect(result).toEqual({ acknowledged: true });
  });

  it('rejects with the error when the plugin responds with an error payload', async () => {
    const resultPromise = bridge.sendRequest('plugin.deactivate', {});

    const sentMsg = sentToPlugin[0] as { type: string; payload: { id: string } };
    const requestId = sentMsg.payload.id;

    dispatchFrom(pluginWindow, 'null', {
      type: 'response',
      payload: { id: requestId, error: { code: 'PLUGIN_ERROR', message: 'oops' } },
    });

    await expect(resultPromise).rejects.toMatchObject({
      code: 'PLUGIN_ERROR',
      message: 'oops',
    });
  });

  it('does not resolve a pending RPC for a response with a different ID', async () => {
    let resolved = false;
    const resultPromise = bridge.sendRequest('plugin.deactivate', {});
    resultPromise.then(() => { resolved = true; }).catch(() => { /* expected */ });

    // Respond with a completely different ID
    dispatchFrom(pluginWindow, 'null', makePluginResponse(crypto.randomUUID(), {}));

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(resolved).toBe(false);

    // Clean up by stopping (rejects remaining pending RPCs)
    bridge.stop();
    await expect(resultPromise).rejects.toMatchObject({ code: 'BRIDGE_STOPPED' });
  });

  it('rejects pending RPC with RPC_TIMEOUT after 5 seconds', async () => {
    vi.useFakeTimers();
    const resultPromise = bridge.sendRequest('plugin.deactivate', {});

    vi.advanceTimersByTime(5_001);

    await expect(resultPromise).rejects.toMatchObject({ code: 'RPC_TIMEOUT' });
    vi.useRealTimers();
  });

  it('rejects all pending RPCs with BRIDGE_STOPPED when stop() is called', async () => {
    const p1 = bridge.sendRequest('plugin.deactivate', {});
    const p2 = bridge.sendRequest('plugin.deactivate', {});

    bridge.stop();

    await expect(p1).rejects.toMatchObject({ code: 'BRIDGE_STOPPED' });
    await expect(p2).rejects.toMatchObject({ code: 'BRIDGE_STOPPED' });
  });

  it('handles concurrent requests independently', async () => {
    const p1 = bridge.sendRequest('plugin.deactivate', { seq: 1 });
    const p2 = bridge.sendRequest('plugin.deactivate', { seq: 2 });

    const [msg1, msg2] = sentToPlugin as Array<{ type: string; payload: { id: string } }>;
    const id1 = msg1!.payload.id;
    const id2 = msg2!.payload.id;
    expect(id1).not.toBe(id2);

    // Answer in reverse order
    dispatchFrom(pluginWindow, 'null', makePluginResponse(id2, 'result-2'));
    dispatchFrom(pluginWindow, 'null', makePluginResponse(id1, 'result-1'));

    expect(await p1).toBe('result-1');
    expect(await p2).toBe('result-2');
  });
});

// ── SandboxLoader — iframe attributes ─────────────────────────────────────────

describe('SandboxLoader', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates an iframe with sandbox="allow-scripts" only', () => {
    const sandboxed = SandboxLoader.create('blob:http://localhost/test', container);
    expect(sandboxed.iframe.getAttribute('sandbox')).toBe('allow-scripts');
    SandboxLoader.destroy(sandboxed);
  });

  it('never sets allow-same-origin in sandbox attribute', () => {
    const sandboxed = SandboxLoader.create('blob:http://localhost/test', container);
    expect(sandboxed.iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
    SandboxLoader.destroy(sandboxed);
  });

  it('never sets allow-storage-access in sandbox attribute', () => {
    const sandboxed = SandboxLoader.create('blob:http://localhost/test', container);
    expect(sandboxed.iframe.getAttribute('sandbox')).not.toContain('allow-storage-access');
    SandboxLoader.destroy(sandboxed);
  });

  it('appends the iframe to the provided container', () => {
    const sandboxed = SandboxLoader.create('blob:http://localhost/test', container);
    expect(container.contains(sandboxed.iframe)).toBe(true);
    SandboxLoader.destroy(sandboxed);
  });

  it('removes the iframe from the DOM on destroy', () => {
    const sandboxed = SandboxLoader.create('blob:http://localhost/test', container);
    SandboxLoader.destroy(sandboxed);
    expect(container.contains(sandboxed.iframe)).toBe(false);
  });

  it('sets the bundle URL as the iframe src', () => {
    const url = 'blob:http://localhost/test-bundle';
    const sandboxed = SandboxLoader.create(url, container);
    expect(sandboxed.iframe.src).toContain('blob:http://localhost/test-bundle');
    SandboxLoader.destroy(sandboxed);
  });

  it('reports origin as the string "null"', () => {
    const sandboxed = SandboxLoader.create('blob:http://localhost/test', container);
    expect(sandboxed.origin).toBe('null');
    SandboxLoader.destroy(sandboxed);
  });
});
