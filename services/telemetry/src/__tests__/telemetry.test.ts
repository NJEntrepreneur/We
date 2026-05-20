import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Sentry must be mocked before any module that imports it
vi.mock('../sentry.js', () => ({
  initSentry:       vi.fn(),
  captureException: vi.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

const { buildServer } = await import('../server.js');
const { LokiWriter } = await import('../audit/loki.js');
const {
  httpDuration, pluginActivations, pluginErrors,
  execCompletions, authTokenRefreshes, authFailures, collabConnections, dbQueryDuration,
} = await import('../metrics/instruments.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Create a fresh exporter per test — prevents OTel SDK startup in tests
function makeExporter(): PrometheusExporter {
  return new PrometheusExporter({ preventServerStart: true });
}

function auditPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id:           '11111111-1111-1111-1111-111111111111',
    timestamp:    new Date().toISOString(),
    actorId:      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    actorRole:    'developer',
    action:       'plugin.install',
    resourceType: 'plugin',
    resourceId:   'com.example.plugin',
    metadata:     { version: '1.0.0' },
    ipAddress:    '127.0.0.1',
    userAgent:    'Mozilla/5.0',
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('telemetry service', () => {
  let fastify: FastifyInstance;
  let baseUrl: string;

  beforeEach(async () => {
    fastify = await buildServer(makeExporter(), null);
    await fastify.listen({ port: 0, host: '127.0.0.1' });
    const port = (fastify.server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await fastify.close();
  });

  // ── Health ─────────────────────────────────────────────────────────────────

  it('GET /health returns { status: ok }', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  // ── Prometheus metrics ─────────────────────────────────────────────────────

  it('GET /metrics returns 200 with Prometheus text format', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/plain');
    const text = await res.text();
    // OTel Prometheus exporter emits at minimum a target_info line
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  // ── Audit endpoint ─────────────────────────────────────────────────────────

  it('POST /audit with valid payload returns 204', async () => {
    const res = await fetch(`${baseUrl}/audit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(auditPayload()),
    });
    expect(res.status).toBe(204);
  });

  it('POST /audit with invalid payload returns 400', async () => {
    const res = await fetch(`${baseUrl}/audit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: 'not-a-uuid', action: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Invalid audit entry');
  });

  it('POST /audit with unknown actorRole returns 400', async () => {
    const res = await fetch(`${baseUrl}/audit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(auditPayload({ actorRole: 'superuser' })),
    });
    expect(res.status).toBe(400);
  });

  // ── Loki forwarding ────────────────────────────────────────────────────────

  it('POST /audit with loki configured calls loki writer', async () => {
    const mockWrite = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
    const mockLoki = { writeAudit: mockWrite } as unknown as InstanceType<typeof LokiWriter>;

    const lokiFastify = await buildServer(makeExporter(), mockLoki);
    await lokiFastify.listen({ port: 0, host: '127.0.0.1' });
    const lokiPort = (lokiFastify.server.address() as AddressInfo).port;

    try {
      const res = await fetch(`http://127.0.0.1:${lokiPort}/audit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(auditPayload()),
      });
      expect(res.status).toBe(204);
      expect(mockWrite).toHaveBeenCalledOnce();
    } finally {
      await lokiFastify.close();
    }
  });

  it('POST /audit continues even when loki write fails', async () => {
    const mockWrite = vi.fn<[], Promise<void>>().mockRejectedValue(new Error('Loki down'));
    const mockLoki = { writeAudit: mockWrite } as unknown as InstanceType<typeof LokiWriter>;

    const lokiFastify = await buildServer(makeExporter(), mockLoki);
    await lokiFastify.listen({ port: 0, host: '127.0.0.1' });
    const lokiPort = (lokiFastify.server.address() as AddressInfo).port;

    try {
      const res = await fetch(`http://127.0.0.1:${lokiPort}/audit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(auditPayload()),
      });
      // Loki failure is best-effort — still returns 204
      expect(res.status).toBe(204);
    } finally {
      await lokiFastify.close();
    }
  });

  // ── Metric instruments ─────────────────────────────────────────────────────

  it('metric instruments are defined and recordable', () => {
    expect(() => {
      httpDuration.record(100, { route: '/health', method: 'GET', status: '200' });
      pluginActivations.add(1, { pluginId: 'com.test' });
      pluginErrors.add(1, { pluginId: 'com.test', reason: 'load-failed' });
      execCompletions.add(1, { language: 'javascript', exitCode: '0' });
      authTokenRefreshes.add(1, { userId: 'u1' });
      authFailures.add(1, { ip_address: '1.2.3.4' });
      collabConnections.add(1, { workspaceId: 'ws1' });
      dbQueryDuration.record(5, { model: 'User', operation: 'findUnique' });
    }).not.toThrow();
  });
});

// ── Grafana alert definitions ─────────────────────────────────────────────────

describe('Grafana alert definitions', () => {
  const alertFiles = [
    '../../src/alerts/error-rate.json',
    '../../src/alerts/p99-latency.json',
    '../../src/alerts/sandbox-queue-depth.json',
    '../../src/alerts/auth-failure-rate.json',
  ] as const;

  for (const file of alertFiles) {
    it(`${file} is valid JSON with required Grafana fields`, async () => {
      const mod = await import(file, { assert: { type: 'json' } });
      const alert = mod.default as Record<string, unknown>;
      expect(typeof alert.uid).toBe('string');
      expect(typeof alert.title).toBe('string');
      expect(typeof alert.condition).toBe('string');
      expect(Array.isArray(alert.data)).toBe(true);
      expect(typeof alert.for).toBe('string');
      expect(typeof alert.labels).toBe('object');
      expect(typeof alert.annotations).toBe('object');
    });
  }
});
