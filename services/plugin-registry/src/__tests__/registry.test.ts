import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildServer } from '../server.js';
import { buildConfig } from '../config.js';
import { sriHash } from '@platform/utils';

// ── In-memory stores ──────────────────────────────────────────────────────────

interface MockPlugin {
  id: string;
  pluginId: string;
  name: string;
  publisherId: string;
  latestVersion: string | null;
  publishedAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockPluginVersion {
  id: string;
  pluginRowId: string;
  version: string;
  integrityHash: string;
  manifest: unknown;
  bundleUrl: string;
  createdAt: Date;
}

type WhereClause = Record<string, unknown>;

const pluginStore        = new Map<string, MockPlugin>();
const pluginVersionStore = new Map<string, MockPluginVersion>();

function matchesWhere(record: Record<string, unknown>, where: WhereClause): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === null) return record[k] === null;
    return record[k] === v;
  });
}

// ── DB mock ───────────────────────────────────────────────────────────────────

vi.mock('../db.js', () => ({
  db: {
    plugin: {
      findUnique: vi.fn((args: { where: WhereClause }) => {
        const hit = [...pluginStore.values()].find((p) =>
          matchesWhere(p as unknown as Record<string, unknown>, args.where),
        );
        return Promise.resolve(hit ?? null);
      }),
      create: vi.fn((args: { data: MockPlugin }) => {
        pluginStore.set(args.data.id, args.data);
        return Promise.resolve(args.data);
      }),
      update: vi.fn(
        (args: { where: { id?: string; pluginId?: string }; data: Partial<MockPlugin> }) => {
          const key = args.where.id
            ? args.where.id
            : [...pluginStore.values()].find((p) => p.pluginId === args.where.pluginId)?.id;
          if (!key) return Promise.resolve(null);
          const existing = pluginStore.get(key);
          if (!existing) return Promise.resolve(null);
          const updated = { ...existing, ...args.data } as MockPlugin;
          pluginStore.set(key, updated);
          return Promise.resolve(updated);
        },
      ),
    },
    pluginVersion: {
      findFirst: vi.fn((args: { where: WhereClause }) => {
        const hit = [...pluginVersionStore.values()].find((v) =>
          matchesWhere(v as unknown as Record<string, unknown>, args.where),
        );
        return Promise.resolve(hit ?? null);
      }),
      create: vi.fn((args: { data: MockPluginVersion }) => {
        pluginVersionStore.set(args.data.id, args.data);
        return Promise.resolve(args.data);
      }),
    },
  },
}));

// ── Storage mock ──────────────────────────────────────────────────────────────

vi.mock('../lib/storage.js', () => ({
  createStorageClient: vi.fn(() => ({
    upload: vi.fn(async (key: string) => `https://mock-s3.local/plugins/${key}`),
    getUrl: vi.fn((key: string) => `https://mock-s3.local/plugins/${key}`),
  })),
}));

// ── Test config ───────────────────────────────────────────────────────────────

const testConfig = buildConfig({
  DATABASE_URL:         'postgresql://test:test@localhost:5432/test',
  JWT_PLUGIN_SECRET:    'test-plugin-secret-long-enough-for-hs256',
  S3_ACCESS_KEY_ID:     'minioadmin',
  S3_SECRET_ACCESS_KEY: 'minioadmin',
});

// ── Fixed test fixtures ───────────────────────────────────────────────────────

const PUBLISHER_ID  = '00000000-0000-0000-0000-000000000001';
const WORKSPACE_ID  = '00000000-0000-0000-0000-000000000002';
const BUNDLE_CONTENT = Buffer.from('console.log("hello from plugin");');

async function makeManifest(overrides: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const integrity = await sriHash(BUNDLE_CONTENT);
  return {
    id:          'com.example.test-plugin',
    name:        'Test Plugin',
    version:     '1.0.0',
    apiVersion:  '1',
    permissions: ['fs.read'],
    entrypoint:  'dist/index.js',
    integrity,
    contributes: { commands: [], panels: [], themes: [], languageProviders: [] },
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let fastify: FastifyInstance;

beforeEach(async () => {
  pluginStore.clear();
  pluginVersionStore.clear();
  vi.clearAllMocks();
  fastify = await buildServer(testConfig);
  await fastify.ready();
});

afterEach(async () => {
  await fastify.close();
});

// ── POST /publish ─────────────────────────────────────────────────────────────

describe('POST /publish', () => {
  it('returns 201 with pluginId, version, and bundleUrl for a valid publish', async () => {
    const manifest = await makeManifest();

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(201);
    expect(res.body.pluginId).toBe('com.example.test-plugin');
    expect(res.body.version).toBe('1.0.0');
    expect(typeof res.body.bundleUrl).toBe('string');
  });

  it('returns 400 when manifest field is missing', async () => {
    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/manifest/i);
  });

  it('returns 400 when bundle file is missing', async () => {
    const manifest = await makeManifest();

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/bundle/i);
  });

  it('returns 400 for invalid manifest schema (bad plugin id)', async () => {
    const manifest = await makeManifest({ id: 'not-a-valid-id' });

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown permission', async () => {
    const manifest = await makeManifest({ permissions: ['evil.permission'] });

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when SRI hash does not match bundle', async () => {
    const manifest = await makeManifest({ integrity: 'sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' });

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/integrity/i);
  });

  it('returns 400 when X-Publisher-Id is missing', async () => {
    const manifest = await makeManifest();

    const res = await supertest(fastify.server)
      .post('/publish')
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when X-Publisher-Id is not a UUID', async () => {
    const manifest = await makeManifest();

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', 'not-a-uuid')
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
  });

  it('returns 409 when the same version is published twice', async () => {
    const manifest = await makeManifest();

    await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    const res = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(409);
  });
});

// ── GET /resolve/:id ──────────────────────────────────────────────────────────

describe('GET /resolve/:id', () => {
  beforeEach(async () => {
    // Publish a plugin so we can resolve it
    const manifest = await makeManifest();
    await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });
  });

  it('returns 200 with manifest, bundleUrl, and a signed plugin token', async () => {
    const res = await supertest(fastify.server)
      .get('/resolve/com.example.test-plugin')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
    expect(res.body.manifest.id).toBe('com.example.test-plugin');
    expect(typeof res.body.bundleUrl).toBe('string');
    expect(typeof res.body.token).toBe('string');
    // JWT has three dot-separated parts
    expect(res.body.token.split('.').length).toBe(3);
  });

  it('returns 404 for a plugin that was never published', async () => {
    const res = await supertest(fastify.server)
      .get('/resolve/com.example.does-not-exist')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(404);
  });

  it('returns 400 when workspaceId query param is missing', async () => {
    const res = await supertest(fastify.server).get(
      '/resolve/com.example.test-plugin',
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when workspaceId is not a valid UUID', async () => {
    const res = await supertest(fastify.server)
      .get('/resolve/com.example.test-plugin')
      .query({ workspaceId: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });
});

// ── DELETE /uninstall/:id ─────────────────────────────────────────────────────

describe('DELETE /uninstall/:id', () => {
  beforeEach(async () => {
    const manifest = await makeManifest();
    await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });
  });

  it('returns 204 and soft-deletes the plugin', async () => {
    const res = await supertest(fastify.server).delete(
      '/uninstall/com.example.test-plugin',
    );

    expect(res.status).toBe(204);

    // Subsequent resolve should return 404
    const resolve = await supertest(fastify.server)
      .get('/resolve/com.example.test-plugin')
      .query({ workspaceId: WORKSPACE_ID });
    expect(resolve.status).toBe(404);
  });

  it('returns 404 for a plugin that was never published', async () => {
    const res = await supertest(fastify.server).delete(
      '/uninstall/com.example.does-not-exist',
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 when called again on an already-uninstalled plugin', async () => {
    await supertest(fastify.server).delete('/uninstall/com.example.test-plugin');

    const res = await supertest(fastify.server).delete(
      '/uninstall/com.example.test-plugin',
    );
    expect(res.status).toBe(404);
  });
});

// ── Full flow: publish → verify (implicit) → resolve → uninstall ──────────────

describe('full registry flow', () => {
  it('completes publish → resolve → uninstall sequence', async () => {
    // 1. Publish
    const manifest = await makeManifest();
    const publish = await supertest(fastify.server)
      .post('/publish')
      .set('X-Publisher-Id', PUBLISHER_ID)
      .field('manifest', JSON.stringify(manifest))
      .attach('bundle', BUNDLE_CONTENT, {
        filename:    'dist/index.js',
        contentType: 'application/javascript',
      });

    expect(publish.status).toBe(201);
    const { pluginId, version } = publish.body as { pluginId: string; version: string };
    expect(pluginId).toBe('com.example.test-plugin');
    expect(version).toBe('1.0.0');

    // 2. Resolve — verifies SRI was accepted at publish, manifest is stored, token issued
    const resolve = await supertest(fastify.server)
      .get(`/resolve/${pluginId}`)
      .query({ workspaceId: WORKSPACE_ID });

    expect(resolve.status).toBe(200);
    expect(resolve.body.manifest.id).toBe(pluginId);
    expect(resolve.body.manifest.integrity).toBe((manifest as { integrity: string }).integrity);
    const token: string = resolve.body.token as string;
    expect(token.split('.').length).toBe(3);

    // 3. Uninstall
    const uninstall = await supertest(fastify.server).delete(`/uninstall/${pluginId}`);
    expect(uninstall.status).toBe(204);

    // 4. Resolve after uninstall → 404
    const afterUninstall = await supertest(fastify.server)
      .get(`/resolve/${pluginId}`)
      .query({ workspaceId: WORKSPACE_ID });
    expect(afterUninstall.status).toBe(404);

    // 5. Double uninstall → 404
    const doubleUninstall = await supertest(fastify.server).delete(`/uninstall/${pluginId}`);
    expect(doubleUninstall.status).toBe(404);
  });
});
