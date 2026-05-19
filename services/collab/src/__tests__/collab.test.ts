import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { WebSocket } from 'ws';
import { SignJWT } from 'jose';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { createEventBus, type EventBus, type PlatformEventMap } from '@platform/events';
import { buildServer } from '../server.js';
import { DocStore } from '../yjs/DocStore.js';
import type { CollabDb } from '../db.js';
import type { CollabConfig } from '../config.js';
import {
  MSG_SYNC, MSG_SYNC_STEP_1, MSG_SYNC_STEP_2, MSG_SYNC_UPDATE,
  encodeSyncStep1, encodeSyncUpdate, parseMessage,
} from '../yjs/protocol.js';

// ── Test config ───────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-access-secret-long-enough-for-hs256';

const TEST_CONFIG: CollabConfig = {
  port: 0,
  host: '127.0.0.1',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  jwtAccessSecret: JWT_SECRET,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockDb(): CollabDb {
  const store = new Map<string, Buffer>();
  return {
    collabDocument: {
      async findUnique({ where }) {
        const state = store.get(where.workspaceId);
        return state !== undefined ? { state } : null;
      },
      async upsert({ where, update }) {
        store.set(where.workspaceId, update.state);
        return null;
      },
    },
  };
}

async function signToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ role: 'developer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(globalThis.crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

// Server may send SYNC_STEP_1 in the same TCP segment as the HTTP 101 upgrade
// response, causing 'message' to fire synchronously right after 'open' before
// the test can register a listener. We buffer every message from creation.
interface BufWs extends WebSocket {
  _buf: Buffer[];
  _waiters: Array<(buf: Buffer) => void>;
}

function openWs(url: string, opts?: ConstructorParameters<typeof WebSocket>[1]): Promise<BufWs> {
  return new Promise<BufWs>((resolve, reject) => {
    const ws = new WebSocket(url, opts) as BufWs;
    ws._buf = [];
    ws._waiters = [];
    ws.on('message', (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      const waiter = ws._waiters.shift();
      if (waiter) {
        waiter(buf);
      } else {
        ws._buf.push(buf);
      }
    });
    ws.once('open',  () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMsg(ws: BufWs): Promise<Buffer> {
  if (ws._buf.length > 0) {
    return Promise.resolve(ws._buf.shift()!);
  }
  return new Promise<Buffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = ws._waiters.indexOf(onMsg);
      if (idx !== -1) ws._waiters.splice(idx, 1);
      reject(new Error('WebSocket message timeout'));
    }, 3_000);
    const onMsg = (buf: Buffer): void => {
      clearTimeout(timer);
      resolve(buf);
    };
    ws._waiters.push(onMsg);
    ws.once('close', (code, reason) => {
      const idx = ws._waiters.indexOf(onMsg);
      if (idx !== -1) ws._waiters.splice(idx, 1);
      clearTimeout(timer);
      reject(new Error(`Socket closed unexpectedly: ${code} ${String(reason)}`));
    });
    ws.once('error', (err) => {
      const idx = ws._waiters.indexOf(onMsg);
      if (idx !== -1) ws._waiters.splice(idx, 1);
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function handshake(ws: BufWs): Promise<void> {
  // Receive server's SYNC_STEP_1, send back our empty SYNC_STEP_1, consume SYNC_STEP_2.
  const step1 = await nextMsg(ws);
  const parsed = parseMessage(new Uint8Array(step1));
  expect(parsed?.type).toBe(MSG_SYNC);
  // Reply with empty state vector (fresh client has no document state)
  ws.send(encodeSyncStep1(Y.encodeStateVector(new Y.Doc())));
  // Consume the server's SYNC_STEP_2
  const step2 = await nextMsg(ws);
  const step2msg = parseMessage(new Uint8Array(step2));
  expect(step2msg?.type).toBe(MSG_SYNC);
  expect(step2msg && 'subtype' in step2msg ? step2msg.subtype : -1).toBe(MSG_SYNC_STEP_2);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('collab WebSocket', () => {
  let fastify: FastifyInstance;
  let bus: EventBus;
  let docStore: DocStore;
  let port: number;
  const WORKSPACE = '11111111-1111-1111-1111-111111111111';
  const USER_A    = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const USER_B    = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(async () => {
    bus      = createEventBus();
    docStore = new DocStore(makeMockDb());
    fastify  = await buildServer(TEST_CONFIG, docStore, bus);
    await fastify.listen({ port: 0, host: '127.0.0.1' });
    port = (fastify.server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await fastify.close();
  });

  // ── Connection ─────────────────────────────────────────────────────────────

  it('accepts a valid JWT via query param and completes the sync handshake', async () => {
    const token = await signToken(USER_A);
    const ws = await openWs(`ws://127.0.0.1:${port}/collab/${WORKSPACE}?token=${token}`);
    await handshake(ws);
    ws.close();
  });

  it('accepts a valid JWT via Authorization header', async () => {
    const token = await signToken(USER_A);
    const ws = await openWs(
      `ws://127.0.0.1:${port}/collab/${WORKSPACE}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await handshake(ws);
    ws.close();
  });

  it('closes with code 4001 when no token is provided', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/collab/${WORKSPACE}`);
    const code = await new Promise<number>((resolve) => {
      ws.on('close', (c) => resolve(c));
    });
    expect(code).toBe(4001);
  });

  it('closes with code 4001 when token is invalid', async () => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/collab/${WORKSPACE}?token=not.a.valid.jwt`,
    );
    const code = await new Promise<number>((resolve) => {
      ws.on('close', (c) => resolve(c));
    });
    expect(code).toBe(4001);
  });

  // ── Events ─────────────────────────────────────────────────────────────────

  it('emits collab.user-joined on connect', async () => {
    const events: PlatformEventMap['collab.user-joined'][] = [];
    bus.on('collab.user-joined', (e: PlatformEventMap['collab.user-joined']) => events.push(e));

    const token = await signToken(USER_A);
    const ws = await openWs(`ws://127.0.0.1:${port}/collab/${WORKSPACE}?token=${token}`);
    await handshake(ws);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ workspaceId: WORKSPACE, userId: USER_A });
    ws.close();
  });

  it('emits collab.user-left on disconnect', async () => {
    const leftEvents: PlatformEventMap['collab.user-left'][] = [];
    bus.on('collab.user-left', (e: PlatformEventMap['collab.user-left']) => leftEvents.push(e));

    const token = await signToken(USER_A);
    const ws = await openWs(`ws://127.0.0.1:${port}/collab/${WORKSPACE}?token=${token}`);
    await handshake(ws);

    const closed = new Promise<void>((resolve) => {
      bus.once('collab.user-left', () => resolve());
    });
    ws.close();
    await closed;

    expect(leftEvents).toHaveLength(1);
    expect(leftEvents[0]).toMatchObject({ workspaceId: WORKSPACE, userId: USER_A });
  });

  // ── Two-client sync ────────────────────────────────────────────────────────

  it('broadcasts an update from one client to another', async () => {
    const tokenA = await signToken(USER_A);
    const tokenB = await signToken(USER_B);
    const wsUrl = `ws://127.0.0.1:${port}/collab/${WORKSPACE}`;

    const wsA = await openWs(`${wsUrl}?token=${tokenA}`);
    const wsB = await openWs(`${wsUrl}?token=${tokenB}`);

    await handshake(wsA);
    await handshake(wsB);

    // Create an incremental update from a local Y.Doc.
    const localDoc = new Y.Doc();
    let capturedUpdate: Uint8Array | undefined;
    localDoc.on('update', (u: Uint8Array) => { capturedUpdate = u; });
    localDoc.getText('content').insert(0, 'hello world');

    if (capturedUpdate === undefined) throw new Error('No update captured');

    // Client A sends the update.
    wsA.send(encodeSyncUpdate(capturedUpdate));

    // Client B should receive a SYNC_UPDATE.
    const raw = await nextMsg(wsB);
    const msg = parseMessage(new Uint8Array(raw));

    expect(msg?.type).toBe(MSG_SYNC);
    expect(msg && 'subtype' in msg ? msg.subtype : -1).toBe(MSG_SYNC_UPDATE);

    // Apply the received payload to an empty doc and verify the content.
    const receiverDoc = new Y.Doc();
    Y.applyUpdate(receiverDoc, (msg as { payload: Uint8Array }).payload);
    expect(receiverDoc.getText('content').toString()).toBe('hello world');

    wsA.close();
    wsB.close();
  });

  it('does not echo the update back to the sender', async () => {
    const token = await signToken(USER_A);
    const ws = await openWs(`ws://127.0.0.1:${port}/collab/${WORKSPACE}?token=${token}`);
    await handshake(ws);

    const localDoc = new Y.Doc();
    let capturedUpdate: Uint8Array | undefined;
    localDoc.on('update', (u: Uint8Array) => { capturedUpdate = u; });
    localDoc.getText('content').insert(0, 'solo edit');
    if (capturedUpdate === undefined) throw new Error('No update captured');

    ws.send(encodeSyncUpdate(capturedUpdate));

    // No echo expected — wait briefly and assert no extra messages arrive.
    const extraMsg = await Promise.race([
      nextMsg(ws).then(() => 'received'),
      new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 300)),
    ]);
    expect(extraMsg).toBe('timeout');

    ws.close();
  });

  it('emits collab.document-saved when an update is applied', async () => {
    const savedEvents: PlatformEventMap['collab.document-saved'][] = [];
    bus.on('collab.document-saved', (e: PlatformEventMap['collab.document-saved']) => savedEvents.push(e));

    const token = await signToken(USER_A);
    const ws = await openWs(`ws://127.0.0.1:${port}/collab/${WORKSPACE}?token=${token}`);
    await handshake(ws);

    const localDoc = new Y.Doc();
    let update: Uint8Array | undefined;
    localDoc.on('update', (u: Uint8Array) => { update = u; });
    localDoc.getText('content').insert(0, 'save me');
    if (update === undefined) throw new Error('No update captured');

    ws.send(encodeSyncUpdate(update));

    // Wait briefly for the async save to complete.
    await new Promise<void>((r) => setTimeout(r, 100));
    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]).toMatchObject({ workspaceId: WORKSPACE });

    ws.close();
  });

  // ── State persistence ──────────────────────────────────────────────────────

  it('sends the existing document state to a new client joining later', async () => {
    const tokenA = await signToken(USER_A);
    const tokenB = await signToken(USER_B);
    const wsUrl  = `ws://127.0.0.1:${port}/collab/${WORKSPACE}`;

    // Client A connects and writes to the doc.
    const wsA = await openWs(`${wsUrl}?token=${tokenA}`);
    await handshake(wsA);

    const localDoc = new Y.Doc();
    let update: Uint8Array | undefined;
    localDoc.on('update', (u: Uint8Array) => { update = u; });
    localDoc.getText('content').insert(0, 'persisted');
    if (update === undefined) throw new Error('No update captured');
    wsA.send(encodeSyncUpdate(update));
    await new Promise<void>((r) => setTimeout(r, 100));
    wsA.close();

    // Client B connects fresh and sends an empty SYNC_STEP_1.
    const wsB = await openWs(`${wsUrl}?token=${tokenB}`);

    // Receive server SYNC_STEP_1
    await nextMsg(wsB);

    // Send empty state vector → server will include all document history in SYNC_STEP_2.
    wsB.send(encodeSyncStep1(Y.encodeStateVector(new Y.Doc())));

    const step2raw = await nextMsg(wsB);
    const step2 = parseMessage(new Uint8Array(step2raw));
    expect(step2?.type).toBe(MSG_SYNC);
    expect(step2 && 'subtype' in step2 ? step2.subtype : -1).toBe(MSG_SYNC_STEP_2);

    const hydrated = new Y.Doc();
    Y.applyUpdate(hydrated, (step2 as { payload: Uint8Array }).payload);
    expect(hydrated.getText('content').toString()).toBe('persisted');

    wsB.close();
  });
});
