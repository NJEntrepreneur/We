import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createEventBus, type EventBus, type PlatformEventMap } from '@platform/events';
import { buildServer } from '../server.js';
import type { ExecutionQueue, ExecutionJobData, ExecutionJobResult } from '../queue/ExecutionQueue.js';
import type { SandboxConfig } from '../config.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_CONFIG: SandboxConfig = {
  port: 4004,
  host: '0.0.0.0',
  redisUrl: 'redis://localhost:6379',
  dockerSocket: '/var/run/docker.sock',
  seccompProfile: './profiles/sandbox.json',
  workerConcurrency: 1,
};

function makeOkResult(overrides: Partial<ExecutionJobResult> = {}): ExecutionJobResult {
  return {
    stdout: 'Hello\n',
    stderr: '',
    exitCode: 0,
    durationMs: 42,
    timedOut: false,
    ...overrides,
  };
}

function makeMockQueue(defaultResult?: ExecutionJobResult) {
  const result = defaultResult ?? makeOkResult();
  const mocks = {
    enqueue:  vi.fn((_d: ExecutionJobData): Promise<ExecutionJobResult> => Promise.resolve(result)),
    getDepth: vi.fn((): Promise<number> => Promise.resolve(0)),
    close:    vi.fn((): Promise<void> => Promise.resolve()),
  };
  return mocks;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /execute', () => {
  let fastify: FastifyInstance;
  let bus: EventBus;
  let mockQueue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    bus = createEventBus();
    mockQueue = makeMockQueue();
    fastify = await buildServer(TEST_CONFIG, mockQueue, bus);
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  // ── Language tests ─────────────────────────────────────────────────────────

  it('executes javascript and returns correct shape', async () => {
    mockQueue.enqueue.mockResolvedValueOnce(makeOkResult({ stdout: 'hello from js\n' }));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'console.log("hello from js")' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['executionId']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body['stdout']).toBe('hello from js\n');
    expect(body['stderr']).toBe('');
    expect(body['exitCode']).toBe(0);
    expect(typeof body['durationMs']).toBe('number');
    expect(body).not.toHaveProperty('timedOut');
  });

  it('executes python code', async () => {
    mockQueue.enqueue.mockResolvedValueOnce(makeOkResult({ stdout: 'hello from python\n' }));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'python', code: 'print("hello from python")' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['stdout']).toBe('hello from python\n');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'python' }),
    );
  });

  it('executes typescript code', async () => {
    mockQueue.enqueue.mockResolvedValueOnce(makeOkResult({ stdout: 'hello ts\n' }));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        language: 'typescript',
        code: 'const msg: string = "hello ts"; console.log(msg)',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['stdout']).toBe('hello ts\n');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'typescript' }),
    );
  });

  it('executes bash code', async () => {
    mockQueue.enqueue.mockResolvedValueOnce(makeOkResult({ stdout: 'hello bash\n' }));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'bash', code: 'echo "hello bash"' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['stdout']).toBe('hello bash\n');
  });

  // ── Timeout handling ───────────────────────────────────────────────────────

  it('emits exec.timeout when job times out', async () => {
    mockQueue.enqueue.mockResolvedValueOnce(
      makeOkResult({ exitCode: 124, timedOut: true, durationMs: 5050 }),
    );

    const timeoutEvents: PlatformEventMap['exec.timeout'][] = [];
    const completedEvents: PlatformEventMap['exec.completed'][] = [];
    bus.on('exec.timeout',   (e) => timeoutEvents.push(e));
    bus.on('exec.completed', (e) => completedEvents.push(e));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'while(true){}', timeoutMs: 5000 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['exitCode']).toBe(124);
    expect(timeoutEvents).toHaveLength(1);
    expect(completedEvents).toHaveLength(0);
  });

  it('passes timeoutMs to queue.enqueue', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'console.log(1)', timeoutMs: 3000 },
    });

    expect(res.statusCode).toBe(200);
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 3000 }),
    );
  });

  it('defaults timeoutMs to 5000 when not provided', async () => {
    await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'python', code: 'print(1)' },
    });

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 5000 }),
    );
  });

  // ── Event emission ─────────────────────────────────────────────────────────

  it('emits exec.started before enqueueing', async () => {
    const startedEvents: PlatformEventMap['exec.started'][] = [];
    bus.on('exec.started', (e) => startedEvents.push(e));

    await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'console.log(1)' },
    });

    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]).toMatchObject({ language: 'javascript' });
    expect(startedEvents[0]?.executionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('emits exec.completed on successful run', async () => {
    const completedEvents: PlatformEventMap['exec.completed'][] = [];
    bus.on('exec.completed', (e) => completedEvents.push(e));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'python', code: 'print("ok")' },
    });

    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(completedEvents).toHaveLength(1);
    expect(completedEvents[0]).toMatchObject({
      executionId: body['executionId'],
      exitCode:    0,
    });
  });

  it('executionId matches across exec.started and exec.completed events', async () => {
    const startedIds:   string[] = [];
    const completedIds: string[] = [];
    bus.on('exec.started',   (e) => startedIds.push(e.executionId));
    bus.on('exec.completed', (e) => completedIds.push(e.executionId));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'console.log(42)' },
    });

    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(startedIds).toEqual([body['executionId']]);
    expect(completedIds).toEqual([body['executionId']]);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 for unknown language', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'ruby', code: 'puts "hi"' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['error']).toBe('Invalid request');
  });

  it('returns 400 when code is missing', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when timeoutMs exceeds 10000', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'console.log(1)', timeoutMs: 99999 },
    });

    expect(res.statusCode).toBe(400);
  });

  it('forwards env vars to queue.enqueue', async () => {
    await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        language: 'python',
        code: 'import os; print(os.environ.get("FOO"))',
        env: { FOO: 'bar' },
      },
    });

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ env: { FOO: 'bar' } }),
    );
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('returns 503 when queue.enqueue throws', async () => {
    mockQueue.enqueue.mockRejectedValueOnce(new Error('Redis unavailable'));

    const res = await fastify.inject({
      method: 'POST',
      url: '/execute',
      payload: { language: 'javascript', code: 'console.log(1)' },
    });

    expect(res.statusCode).toBe(503);
  });
});

// ── GET /health ───────────────────────────────────────────────────────────────

describe('GET /health', () => {
  let fastify: FastifyInstance;
  let mockQueue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    mockQueue = makeMockQueue();
    fastify = await buildServer(TEST_CONFIG, mockQueue, createEventBus());
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('returns status ok and queue depth', async () => {
    mockQueue.getDepth.mockResolvedValueOnce(7);

    const res = await fastify.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['status']).toBe('ok');
    expect(body['queueDepth']).toBe(7);
  });

  it('returns queueDepth 0 when queue is empty', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['queueDepth']).toBe(0);
  });
});
