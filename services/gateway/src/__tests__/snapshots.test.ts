import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { SignJWT } from 'jose';
import { buildServer } from '../server.js';
import { buildConfig } from '../config.js';
import { InMemorySnapshotStore } from '../snapshots/SnapshotStore.js';
import { Role } from '@platform/types';
import type { WorkspaceSnapshot } from '@platform/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET_STRING = 'test-secret-that-is-long-enough-for-hs256-algorithm';
const SECRET = new TextEncoder().encode(SECRET_STRING);
const USER_ID = '00000000-0000-0000-0000-000000000001';

async function makeToken(userId = USER_ID): Promise<string> {
  return new SignJWT({ sub: userId, jti: '00000000-0000-0000-0000-000000000002', role: Role.Developer })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(SECRET);
}

const testConfig = buildConfig({
  JWT_ACCESS_SECRET: SECRET_STRING,
  HOST: '127.0.0.1',
  AUTH_SERVICE_URL: 'http://127.0.0.1:19999',
  PLUGIN_REGISTRY_URL: 'http://127.0.0.1:19998',
  EXEC_SANDBOX_URL: 'http://127.0.0.1:19997',
  COLLAB_SERVICE_URL: 'http://127.0.0.1:19996',
});

function validSnapshot(): WorkspaceSnapshot {
  return {
    version: '1',
    workspaceId: '11111111-1111-1111-1111-111111111111',
    capturedAt: '2026-05-19T00:00:00.000Z',
    openFiles: ['src/index.ts', 'src/App.tsx'],
    activePlugins: [{ id: 'com.example.plugin', version: '1.0.0' }],
    layout: {
      sidebar: { visible: true, width: 240 },
      bottom: { visible: false, height: 200 },
      editor: { activeFile: 'src/index.ts' },
    },
    editorState: {
      'src/index.ts': { scrollTop: 0, scrollLeft: 0, cursorState: [{ lineNumber: 1, column: 1 }] },
    },
    settings: {
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
      formatOnSave: true,
      wordWrap: 'on',
      minimap: false,
    },
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let fastify: FastifyInstance;
let store: InMemorySnapshotStore;

beforeEach(async () => {
  store = new InMemorySnapshotStore();
  fastify = await buildServer(testConfig, store);
  await fastify.ready();
});

afterEach(async () => {
  await fastify.close();
});

// ── POST /snapshots ───────────────────────────────────────────────────────────

describe('POST /snapshots', () => {
  it('returns 401 without a JWT', async () => {
    const res = await supertest(fastify.server)
      .post('/snapshots')
      .send(validSnapshot());
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid snapshot body', async () => {
    const token = await makeToken();
    const res = await supertest(fastify.server)
      .post('/snapshots')
      .set('Authorization', `Bearer ${token}`)
      .send({ version: '99', workspaceId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'Invalid snapshot' });
  });

  it('stores the snapshot and returns { id }', async () => {
    const token = await makeToken();
    const res = await supertest(fastify.server)
      .post('/snapshots')
      .set('Authorization', `Bearer ${token}`)
      .send(validSnapshot());
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
  });
});

// ── GET /snapshots/:id ────────────────────────────────────────────────────────

describe('GET /snapshots/:id', () => {
  it('returns 401 without a JWT', async () => {
    const res = await supertest(fastify.server).get('/snapshots/some-id');
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown snapshot id', async () => {
    const token = await makeToken();
    const res = await supertest(fastify.server)
      .get('/snapshots/00000000-0000-0000-0000-000000000099')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Snapshot not found' });
  });

  it('returns the stored snapshot after a successful upload', async () => {
    const token = await makeToken();
    const snap = validSnapshot();

    const postRes = await supertest(fastify.server)
      .post('/snapshots')
      .set('Authorization', `Bearer ${token}`)
      .send(snap);
    expect(postRes.status).toBe(201);

    const { id } = postRes.body as { id: string };
    const getRes = await supertest(fastify.server)
      .get(`/snapshots/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.version).toBe('1');
    expect(getRes.body.workspaceId).toBe(snap.workspaceId);
    expect(getRes.body.openFiles).toEqual(snap.openFiles);
    expect(getRes.body.settings).toEqual(snap.settings);
  });

  it('does not allow a different user to access another user snapshot', async () => {
    const tokenA = await makeToken('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const tokenB = await makeToken('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

    const postRes = await supertest(fastify.server)
      .post('/snapshots')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validSnapshot());
    expect(postRes.status).toBe(201);
    const { id } = postRes.body as { id: string };

    const getRes = await supertest(fastify.server)
      .get(`/snapshots/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(getRes.status).toBe(404);
  });
});

// ── Round-trip ────────────────────────────────────────────────────────────────

describe('upload → download round-trip', () => {
  it('preserves all snapshot fields through storage and retrieval', async () => {
    const token = await makeToken();
    const snap = validSnapshot();

    const { body: { id } } = await supertest(fastify.server)
      .post('/snapshots')
      .set('Authorization', `Bearer ${token}`)
      .send(snap)
      .expect(201) as { body: { id: string } };

    const { body: retrieved } = await supertest(fastify.server)
      .get(`/snapshots/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200) as { body: WorkspaceSnapshot };

    expect(retrieved.version).toBe(snap.version);
    expect(retrieved.workspaceId).toBe(snap.workspaceId);
    expect(retrieved.openFiles).toEqual(snap.openFiles);
    expect(retrieved.activePlugins).toEqual(snap.activePlugins);
    expect(retrieved.layout).toEqual(snap.layout);
    expect(retrieved.editorState).toEqual(snap.editorState);
    expect(retrieved.settings).toEqual(snap.settings);
  });
});
