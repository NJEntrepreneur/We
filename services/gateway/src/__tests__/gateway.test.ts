import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { SignJWT } from 'jose';
import { buildServer } from '../server.js';
import { buildConfig } from '../config.js';
import { Role } from '@platform/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET_STRING = 'test-secret-that-is-long-enough-for-hs256-algorithm';
const SECRET = new TextEncoder().encode(SECRET_STRING);

async function makeToken(role = Role.Developer): Promise<string> {
  return new SignJWT({
    sub: '00000000-0000-0000-0000-000000000001',
    jti: '00000000-0000-0000-0000-000000000002',
    role,
  })
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

let fastify: FastifyInstance;

beforeEach(async () => {
  fastify = await buildServer(testConfig);
  await fastify.ready();
});

afterEach(async () => {
  await fastify.close();
});

// ── X-Trace-Id injection ──────────────────────────────────────────────────────

describe('X-Trace-Id header', () => {
  it('echoes the incoming x-trace-id header if provided', async () => {
    const res = await supertest(fastify.server)
      .get('/nonexistent-route')
      .set('x-trace-id', 'my-trace-id-value');
    expect(res.headers['x-trace-id']).toBe('my-trace-id-value');
  });

  it('generates an x-trace-id header when none is provided', async () => {
    const res = await supertest(fastify.server).get('/nonexistent-route');
    const traceId = res.headers['x-trace-id'] ?? '';
    expect(typeof traceId).toBe('string');
    expect(traceId.length).toBeGreaterThan(0);
  });

  it('generates different trace IDs for different requests', async () => {
    const [r1, r2] = await Promise.all([
      supertest(fastify.server).get('/nonexistent-route'),
      supertest(fastify.server).get('/nonexistent-route'),
    ]);
    expect(r1.headers['x-trace-id']).not.toBe(r2.headers['x-trace-id']);
  });
});

// ── JWT middleware (protected routes) ─────────────────────────────────────────

describe('JWT enforcement on protected routes', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const res = await supertest(fastify.server).get('/plugins/any');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is malformed', async () => {
    const res = await supertest(fastify.server)
      .get('/exec/run')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the Bearer keyword is missing', async () => {
    const token = await makeToken();
    const res = await supertest(fastify.server)
      .get('/plugins/any')
      .set('Authorization', token);
    expect(res.status).toBe(401);
  });

  it('accepts a valid JWT (upstream connection failure is expected)', async () => {
    const token = await makeToken();
    const res = await supertest(fastify.server)
      .get('/plugins/any')
      .set('Authorization', `Bearer ${token}`);
    // JWT was valid; upstream is down so we expect 502/503, not 401
    expect(res.status).not.toBe(401);
  });
});

// ── Auth routes (no JWT required) ────────────────────────────────────────────

describe('Auth routes bypass JWT', () => {
  it('forwards /auth/* without requiring Authorization (upstream down → not 401)', async () => {
    const res = await supertest(fastify.server).post('/auth/login');
    expect(res.status).not.toBe(401);
  });
});
