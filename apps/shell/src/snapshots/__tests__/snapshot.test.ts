import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkspaceSnapshotSchema, type WorkspaceSnapshot } from '@platform/types';
import { exportSnapshot, importSnapshot } from '../snapshotService.js';
import { useSnapshotStore } from '../useSnapshotStore.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    version: '1',
    workspaceId: '11111111-1111-1111-1111-111111111111',
    capturedAt: '2026-05-19T00:00:00.000Z',
    openFiles: ['src/main.ts', 'src/App.tsx'],
    activePlugins: [{ id: 'com.example.test', version: '2.0.0' }],
    layout: {
      sidebar: { visible: true, width: 300 },
      bottom: { visible: true, height: 150 },
      editor: { activeFile: 'src/main.ts' },
    },
    editorState: {
      'src/main.ts': {
        scrollTop: 10,
        scrollLeft: 0,
        cursorState: [{ lineNumber: 5, column: 3 }],
      },
    },
    settings: {
      theme: 'vs-dark',
      fontSize: 13,
      tabSize: 2,
      formatOnSave: false,
      wordWrap: 'off',
      minimap: true,
    },
    ...overrides,
  };
}

// ── Schema round-trip ─────────────────────────────────────────────────────────

describe('WorkspaceSnapshot schema round-trip', () => {
  it('parses a valid snapshot without throwing', () => {
    const snap = makeSnapshot();
    const parsed = WorkspaceSnapshotSchema.parse(snap);
    expect(parsed.version).toBe('1');
    expect(parsed.workspaceId).toBe(snap.workspaceId);
    expect(parsed.openFiles).toEqual(snap.openFiles);
    expect(parsed.activePlugins).toEqual(snap.activePlugins);
  });

  it('JSON serialize → parse preserves all fields', () => {
    const snap = makeSnapshot();
    const roundTripped = WorkspaceSnapshotSchema.parse(
      JSON.parse(JSON.stringify(snap)) as unknown,
    );
    expect(roundTripped).toEqual(snap);
  });

  it('rejects an unknown version literal', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse(makeSnapshot({ version: '2' as '1' })),
    ).toThrow();
  });

  it('rejects a non-UUID workspaceId', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse(makeSnapshot({ workspaceId: 'not-a-uuid' })),
    ).toThrow();
  });

  it('rejects an invalid plugin id format', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse(
        makeSnapshot({ activePlugins: [{ id: 'INVALID', version: '1.0.0' }] }),
      ),
    ).toThrow();
  });

  it('rejects a fontSize outside the allowed range', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse(
        makeSnapshot({ settings: { ...makeSnapshot().settings, fontSize: 100 } }),
      ),
    ).toThrow();
  });

  it('rejects an unknown wordWrap value', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse(
        makeSnapshot({
          settings: { ...makeSnapshot().settings, wordWrap: 'maybe' as 'off' },
        }),
      ),
    ).toThrow();
  });

  it('accepts a snapshot with no open files and no plugins', () => {
    const snap = makeSnapshot({ openFiles: [], activePlugins: [] });
    const parsed = WorkspaceSnapshotSchema.parse(snap);
    expect(parsed.openFiles).toHaveLength(0);
    expect(parsed.activePlugins).toHaveLength(0);
  });

  it('accepts null as the active editor file', () => {
    const snap = makeSnapshot({
      layout: {
        ...makeSnapshot().layout,
        editor: { activeFile: null },
      },
    });
    const parsed = WorkspaceSnapshotSchema.parse(snap);
    expect(parsed.layout.editor.activeFile).toBeNull();
  });
});

// ── snapshotService.exportSnapshot ────────────────────────────────────────────

describe('exportSnapshot', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('POSTs the snapshot to /snapshots with the auth token and returns the id', async () => {
    const mockId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: mockId }), { status: 200 }),
    ));

    const id = await exportSnapshot(makeSnapshot(), 'my-token');
    expect(id).toBe(mockId);

    const mockFetch = vi.mocked(fetch);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/snapshots');
    expect(opts.method).toBe('POST');
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token');
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body as string) as unknown).toEqual(makeSnapshot());
  });

  it('throws when the server responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 500 }),
    ));
    await expect(exportSnapshot(makeSnapshot(), 'tok')).rejects.toThrow('500');
  });

  it('throws when the server returns an invalid response body', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ notId: true }), { status: 200 }),
    ));
    await expect(exportSnapshot(makeSnapshot(), 'tok')).rejects.toThrow();
  });
});

// ── snapshotService.importSnapshot ────────────────────────────────────────────

describe('importSnapshot', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('GETs /snapshots/:id with the auth token and validates the response', async () => {
    const snap = makeSnapshot();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(snap), { status: 200 }),
    ));

    const result = await importSnapshot('some-id', 'my-token');
    expect(result).toEqual(snap);

    const mockFetch = vi.mocked(fetch);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/snapshots/some-id');
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });

  it('throws when the server returns a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));
    await expect(importSnapshot('bad-id', 'tok')).rejects.toThrow('404');
  });

  it('throws when the server returns JSON that fails schema validation', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ version: '99', broken: true }), { status: 200 }),
    ));
    await expect(importSnapshot('id', 'tok')).rejects.toThrow();
  });
});

// ── useSnapshotStore ──────────────────────────────────────────────────────────

describe('useSnapshotStore', () => {
  beforeEach(() => {
    useSnapshotStore.setState({ status: 'idle', lastSnapshotId: null, error: null });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('transitions to success and stores the id on a successful export', async () => {
    const mockId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: mockId }), { status: 200 }),
    ));

    const id = await useSnapshotStore.getState().exportSnapshot(makeSnapshot(), 'tok');
    expect(id).toBe(mockId);
    expect(useSnapshotStore.getState().status).toBe('success');
    expect(useSnapshotStore.getState().lastSnapshotId).toBe(mockId);
    expect(useSnapshotStore.getState().error).toBeNull();
  });

  it('transitions to error when export fails', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));
    await expect(
      useSnapshotStore.getState().exportSnapshot(makeSnapshot(), 'tok'),
    ).rejects.toThrow();
    expect(useSnapshotStore.getState().status).toBe('error');
    expect(useSnapshotStore.getState().error).toContain('503');
  });

  it('transitions to success and returns the snapshot on a successful import', async () => {
    const snap = makeSnapshot();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(snap), { status: 200 }),
    ));

    const result = await useSnapshotStore.getState().importSnapshot('some-id', 'tok');
    expect(result).toEqual(snap);
    expect(useSnapshotStore.getState().status).toBe('success');
  });

  it('transitions to error when import fails', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));
    await expect(
      useSnapshotStore.getState().importSnapshot('bad', 'tok'),
    ).rejects.toThrow();
    expect(useSnapshotStore.getState().status).toBe('error');
  });

  it('reset clears status and error', () => {
    useSnapshotStore.setState({ status: 'error', error: 'oops', lastSnapshotId: null });
    useSnapshotStore.getState().reset();
    expect(useSnapshotStore.getState().status).toBe('idle');
    expect(useSnapshotStore.getState().error).toBeNull();
  });
});
