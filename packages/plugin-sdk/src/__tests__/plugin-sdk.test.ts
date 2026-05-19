import { beforeEach, afterEach, describe, it, expect, vi, type MockInstance } from 'vitest';
import { createPluginSDK, type PluginSDK } from '../PluginSDK.js';
import type { ParentWindow } from '../RpcClient.js';

// ── Test harness ──────────────────────────────────────────────────────────────

interface SentMessage {
  type: 'request';
  payload: {
    id: string;
    method: string;
    params: unknown;
    capabilityToken: string;
  };
}

function makeMockParent(): { win: ParentWindow; postMessageSpy: MockInstance; sent: SentMessage[] } {
  const sent: SentMessage[] = [];
  const postMessageSpy = vi.fn((msg: unknown) => {
    sent.push(msg as SentMessage);
  });
  const win: ParentWindow = { postMessage: postMessageSpy };
  return { win, postMessageSpy, sent };
}

// Simulate the host sending a success response back to the plugin.
function replyOk(mockParent: ParentWindow, requestId: string, result: unknown): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: mockParent as unknown as MessageEventSource,
      data: { type: 'response', payload: { id: requestId, result } },
    }),
  );
}

// Simulate the host sending an error response.
function replyError(
  mockParent: ParentWindow,
  requestId: string,
  code: string,
  message: string,
): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: mockParent as unknown as MessageEventSource,
      data: { type: 'response', payload: { id: requestId, error: { code, message } } },
    }),
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const TOKEN = 'test-capability-token';

let mock: ReturnType<typeof makeMockParent>;
let sdk: PluginSDK;

beforeEach(async () => {
  mock = makeMockParent();
  sdk = createPluginSDK(mock.win);
  await sdk.ready(TOKEN);
});

afterEach(() => {
  sdk.dispose();
  vi.clearAllMocks();
});

// ── ready() ───────────────────────────────────────────────────────────────────

describe('PluginSDK.ready()', () => {
  it('resolves immediately', async () => {
    const fresh = createPluginSDK(mock.win);
    await expect(fresh.ready(TOKEN)).resolves.toBeUndefined();
    fresh.dispose();
  });

  it('is idempotent — calling twice has no effect', async () => {
    await sdk.ready('second-call-ignored');
    // Still uses the first token
    const p = sdk.fs.read('/x.ts');
    const [msg] = mock.sent;
    expect(msg?.payload.capabilityToken).toBe(TOKEN);
    replyOk(mock.win, msg!.payload.id, { content: '' });
    await p;
  });

  it('rejects RPC calls made before ready()', async () => {
    const fresh = createPluginSDK(mock.win);
    await expect(fresh.fs.read('/x.ts')).rejects.toMatchObject({ code: 'NOT_READY' });
    fresh.dispose();
  });
});

// ── fs.read ───────────────────────────────────────────────────────────────────

describe('sdk.fs.read()', () => {
  it('sends a postMessage with method "fs.read" and the correct path', async () => {
    const p = sdk.fs.read('/src/main.ts');
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('fs.read');
    expect(msg?.payload.params).toEqual({ path: '/src/main.ts' });
    expect(msg?.payload.capabilityToken).toBe(TOKEN);

    replyOk(mock.win, msg!.payload.id, { content: 'const x = 1;' });
    const result = await p;
    expect(result.content).toBe('const x = 1;');
  });

  it('rejects with the host error on PERMISSION_DENIED', async () => {
    const p = sdk.fs.read('/secret.ts');
    const [msg] = mock.sent;
    replyError(mock.win, msg!.payload.id, 'PERMISSION_DENIED', 'Not allowed');
    await expect(p).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// ── fs.write ──────────────────────────────────────────────────────────────────

describe('sdk.fs.write()', () => {
  it('sends a postMessage with method "fs.write" and path + content', async () => {
    const p = sdk.fs.write('/out.ts', 'export default 42;');
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('fs.write');
    expect(msg?.payload.params).toEqual({ path: '/out.ts', content: 'export default 42;' });

    replyOk(mock.win, msg!.payload.id, { ok: true });
    const result = await p;
    expect(result.ok).toBe(true);
  });
});

// ── terminal.spawn ────────────────────────────────────────────────────────────

describe('sdk.terminal.spawn()', () => {
  it('sends method "terminal.spawn" with command and resolves with pid', async () => {
    const p = sdk.terminal.spawn('git', { args: ['status'], cwd: '/repo' });
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('terminal.spawn');
    expect(msg?.payload.params).toEqual({ command: 'git', args: ['status'], cwd: '/repo' });

    replyOk(mock.win, msg!.payload.id, { pid: 4242 });
    const result = await p;
    expect(result.pid).toBe(4242);
  });

  it('accepts a bare command with no options', async () => {
    const p = sdk.terminal.spawn('npm');
    const [msg] = mock.sent;
    expect(msg?.payload.params).toMatchObject({ command: 'npm' });
    replyOk(mock.win, msg!.payload.id, { pid: 1 });
    await expect(p).resolves.toEqual({ pid: 1 });
  });
});

// ── network.fetch ─────────────────────────────────────────────────────────────

describe('sdk.network.fetch()', () => {
  it('sends method "network.fetch" with url and options', async () => {
    const p = sdk.network.fetch('https://api.example.com/data', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    '{"key":"value"}',
    });
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('network.fetch');
    expect(msg?.payload.params).toEqual({
      url:     'https://api.example.com/data',
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    '{"key":"value"}',
    });

    replyOk(mock.win, msg!.payload.id, {
      status:  200,
      headers: { 'content-type': 'application/json' },
      body:    '{"result":true}',
    });
    const result = await p;
    expect(result.status).toBe(200);
    expect(result.body).toBe('{"result":true}');
  });

  it('accepts a bare URL with no options', async () => {
    const p = sdk.network.fetch('https://example.com/');
    const [msg] = mock.sent;
    expect(msg?.payload.params).toMatchObject({ url: 'https://example.com/' });
    replyOk(mock.win, msg!.payload.id, { status: 200, headers: {}, body: 'ok' });
    await expect(p).resolves.toMatchObject({ status: 200 });
  });
});

// ── editor.decorate ───────────────────────────────────────────────────────────

describe('sdk.editor.decorate()', () => {
  const decoration = {
    filePath:  '/src/app.ts',
    range:     { startLine: 0, startColumn: 0, endLine: 0, endColumn: 10 },
    className: 'error-highlight',
  };

  it('sends method "editor.decorate" with decorations array', async () => {
    const p = sdk.editor.decorate([decoration]);
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('editor.decorate');
    expect(msg?.payload.params).toEqual({ decorations: [decoration] });

    replyOk(mock.win, msg!.payload.id, { ok: true });
    const result = await p;
    expect(result.ok).toBe(true);
  });

  it('sends an empty decorations array when given []', async () => {
    const p = sdk.editor.decorate([]);
    const [msg] = mock.sent;
    expect((msg?.payload.params as { decorations: unknown[] }).decorations).toEqual([]);
    replyOk(mock.win, msg!.payload.id, { ok: true });
    await expect(p).resolves.toEqual({ ok: true });
  });
});

// ── editor.commands.register ──────────────────────────────────────────────────

describe('sdk.editor.commands.register()', () => {
  it('sends method "editor.commands.register" with id, title, and optional description', async () => {
    const p = sdk.editor.commands.register('my.cmd', 'My Command', 'Does something');
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('editor.commands.register');
    expect(msg?.payload.params).toEqual({
      id: 'my.cmd', title: 'My Command', description: 'Does something',
    });

    replyOk(mock.win, msg!.payload.id, { ok: true });
    const result = await p;
    expect(result.ok).toBe(true);
  });

  it('sends without description when omitted', async () => {
    const p = sdk.editor.commands.register('my.cmd', 'My Command');
    const [msg] = mock.sent;
    expect(msg?.payload.params).toEqual({ id: 'my.cmd', title: 'My Command', description: undefined });
    replyOk(mock.win, msg!.payload.id, { ok: true });
    await expect(p).resolves.toEqual({ ok: true });
  });
});

// ── editor.commands.unregister ────────────────────────────────────────────────

describe('sdk.editor.commands.unregister()', () => {
  it('sends method "editor.commands.unregister" with the command id', async () => {
    const p = sdk.editor.commands.unregister('my.cmd');
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('editor.commands.unregister');
    expect(msg?.payload.params).toEqual({ id: 'my.cmd' });

    replyOk(mock.win, msg!.payload.id, { ok: true });
    await expect(p).resolves.toEqual({ ok: true });
  });
});

// ── ui.panel.register ─────────────────────────────────────────────────────────

describe('sdk.ui.panel.register()', () => {
  it('sends method "ui.panel.register" with full panel params', async () => {
    const p = sdk.ui.panel.register({
      id:       'my-panel',
      title:    'My Panel',
      icon:     'plugin',
      position: 'sidebar',
    });
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('ui.panel.register');
    expect(msg?.payload.params).toEqual({
      id: 'my-panel', title: 'My Panel', icon: 'plugin', position: 'sidebar',
    });

    replyOk(mock.win, msg!.payload.id, { ok: true });
    await expect(p).resolves.toEqual({ ok: true });
  });

  it('accepts "bottom" as a panel position', async () => {
    const p = sdk.ui.panel.register({ id: 'logs', title: 'Logs', position: 'bottom' });
    const [msg] = mock.sent;
    expect((msg?.payload.params as { position: string }).position).toBe('bottom');
    replyOk(mock.win, msg!.payload.id, { ok: true });
    await expect(p).resolves.toEqual({ ok: true });
  });
});

// ── settings.read ─────────────────────────────────────────────────────────────

describe('sdk.settings.read()', () => {
  it('sends method "settings.read" and resolves with values record', async () => {
    const p = sdk.settings.read();
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('settings.read');
    expect(msg?.payload.params).toEqual({});

    replyOk(mock.win, msg!.payload.id, { values: { theme: 'dark', fontSize: 14 } });
    const result = await p;
    expect(result.values['theme']).toBe('dark');
    expect(result.values['fontSize']).toBe(14);
  });
});

// ── settings.write ────────────────────────────────────────────────────────────

describe('sdk.settings.write()', () => {
  it('sends method "settings.write" with key and value', async () => {
    const p = sdk.settings.write('theme', 'light');
    const [msg] = mock.sent;
    expect(msg?.payload.method).toBe('settings.write');
    expect(msg?.payload.params).toEqual({ key: 'theme', value: 'light' });

    replyOk(mock.win, msg!.payload.id, { ok: true });
    await expect(p).resolves.toEqual({ ok: true });
  });
});

// ── RPC timeout ───────────────────────────────────────────────────────────────

describe('RPC timeout', () => {
  it('rejects with RPC_TIMEOUT after 5 seconds if the host does not respond', async () => {
    vi.useFakeTimers();

    const p = sdk.fs.read('/slow.ts');
    vi.advanceTimersByTime(5_001);

    await expect(p).rejects.toMatchObject({ code: 'RPC_TIMEOUT' });
    vi.useRealTimers();
  });

  it('does not reject early — still pending just before timeout', async () => {
    vi.useFakeTimers();

    let settled = false;
    const p = sdk.fs.read('/slow.ts');
    p.then(() => { settled = true; }).catch(() => { settled = true; });

    vi.advanceTimersByTime(4_999);
    await Promise.resolve(); // flush microtasks
    expect(settled).toBe(false);

    vi.advanceTimersByTime(2);
    await expect(p).rejects.toMatchObject({ code: 'RPC_TIMEOUT' });
    vi.useRealTimers();
  });
});

// ── Error propagation ─────────────────────────────────────────────────────────

describe('error propagation', () => {
  it('rejects with the error code and message from the host response', async () => {
    const p = sdk.fs.write('/locked.ts', 'data');
    const [msg] = mock.sent;
    replyError(mock.win, msg!.payload.id, 'HANDLER_ERROR', 'File is locked');
    await expect(p).rejects.toMatchObject({ code: 'HANDLER_ERROR', message: 'File is locked' });
  });

  it('rejects with ZodError when the host returns a result with wrong shape', async () => {
    const p = sdk.fs.read('/bad.ts');
    const [msg] = mock.sent;
    // Host returns wrong shape — content should be a string
    replyOk(mock.win, msg!.payload.id, { wrongField: 99 });
    await expect(p).rejects.toThrow();
  });

  it('ignores responses with a non-matching request ID', async () => {
    let settled = false;
    const p = sdk.fs.read('/x.ts');
    p.then(() => { settled = true; }).catch(() => { settled = true; });

    // Respond with a completely different ID
    replyOk(mock.win, 'ffffffff-ffff-ffff-ffff-ffffffffffff', { content: 'ignored' });
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(settled).toBe(false);

    // Clean up
    sdk.dispose();
    await p.catch(() => { /* BRIDGE_STOPPED */ });
  });

  it('rejects all in-flight calls with SDK_STOPPED when dispose() is called', async () => {
    const p1 = sdk.fs.read('/a.ts');
    const p2 = sdk.fs.write('/b.ts', 'x');
    sdk.dispose();
    await expect(p1).rejects.toMatchObject({ code: 'SDK_STOPPED' });
    await expect(p2).rejects.toMatchObject({ code: 'SDK_STOPPED' });
  });
});

// ── postMessage envelope ──────────────────────────────────────────────────────

describe('postMessage envelope', () => {
  it('every request carries the capability token from ready()', async () => {
    const p1 = sdk.fs.read('/a.ts');
    const p2 = sdk.settings.read();

    const [m1, m2] = mock.sent;
    expect(m1?.payload.capabilityToken).toBe(TOKEN);
    expect(m2?.payload.capabilityToken).toBe(TOKEN);

    replyOk(mock.win, m1!.payload.id, { content: '' });
    replyOk(mock.win, m2!.payload.id, { values: {} });
    await Promise.all([p1, p2]);
  });

  it('every request has a unique UUID id', async () => {
    const p1 = sdk.fs.read('/a.ts');
    const p2 = sdk.fs.read('/b.ts');

    const [m1, m2] = mock.sent;
    expect(m1?.payload.id).not.toBe(m2?.payload.id);
    expect(m1?.payload.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    replyOk(mock.win, m1!.payload.id, { content: 'a' });
    replyOk(mock.win, m2!.payload.id, { content: 'b' });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.content).toBe('a');
    expect(r2.content).toBe('b');
  });

  it('sends with target origin "*" (required for sandboxed null-origin iframes)', async () => {
    sdk.fs.read('/x.ts');
    const [, targetOrigin] = mock.postMessageSpy.mock.calls[0] as [unknown, string];
    expect(targetOrigin).toBe('*');

    const [msg] = mock.sent;
    replyOk(mock.win, msg!.payload.id, { content: '' });
  });
});
