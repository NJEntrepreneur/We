import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger.js';

function captureStdout(): { lines: () => string[]; restore: () => void } {
  const written: string[] = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((data) => {
    written.push(String(data));
    return true;
  });
  return {
    lines: () => written,
    restore: () => spy.mockRestore(),
  };
}

function parseEntry(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const parsed: unknown = JSON.parse(trimmed);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Log entry is not an object');
  }
  return parsed as Record<string, unknown>;
}

describe('createLogger', () => {
  let capture: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    capture = captureStdout();
  });

  afterEach(() => {
    capture.restore();
  });

  it('writes valid JSON terminated by a newline', () => {
    const logger = createLogger('svc');
    logger.info('hello');
    const lines = capture.lines();
    expect(lines).toHaveLength(1);
    const raw = lines[0];
    expect(raw).toBeDefined();
    expect(raw).toMatch(/\n$/);
    expect(() => parseEntry(raw ?? '')).not.toThrow();
  });

  it('includes all required §12 fields', () => {
    const logger = createLogger('auth');
    logger.info('token refreshed');
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect(entry.level).toBe('info');
    expect(entry.service).toBe('auth');
    expect(entry.message).toBe('token refreshed');
    expect(typeof entry.timestamp).toBe('string');
    // timestamp must be ISO 8601
    expect(() => new Date(entry.timestamp as string).toISOString()).not.toThrow();
  });

  it.each([
    ['debug', 'debug'],
    ['info',  'info'],
    ['warn',  'warn'],
    ['error', 'error'],
  ] as const)('%s() sets level to %s', (method, expectedLevel) => {
    const logger = createLogger('svc');
    logger[method]('msg');
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect(entry.level).toBe(expectedLevel);
  });

  it('includes optional context fields when provided', () => {
    const logger = createLogger('gateway');
    logger.info('request', { traceId: 'trace-1', userId: 'user-1', durationMs: 42 });
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect(entry.traceId).toBe('trace-1');
    expect(entry.userId).toBe('user-1');
    expect(entry.durationMs).toBe(42);
  });

  it('omits optional fields when not provided', () => {
    const logger = createLogger('svc');
    logger.info('bare message');
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect('traceId' in entry).toBe(false);
    expect('spanId' in entry).toBe(false);
    expect('userId' in entry).toBe(false);
    expect('durationMs' in entry).toBe(false);
  });

  it('child() merges parent context into every line', () => {
    const logger = createLogger('svc');
    const child = logger.child({ traceId: 'parent-trace', userId: 'u1' });
    child.info('from child');
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect(entry.traceId).toBe('parent-trace');
    expect(entry.userId).toBe('u1');
    expect(entry.message).toBe('from child');
  });

  it('call-site context overrides child default context', () => {
    const logger = createLogger('svc');
    const child = logger.child({ traceId: 'default-trace' });
    child.info('override', { traceId: 'override-trace' });
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect(entry.traceId).toBe('override-trace');
  });

  it('child() inherits the service name', () => {
    const logger = createLogger('collab');
    const child = logger.child({ spanId: 's1' });
    child.warn('warn from child');
    const entry = parseEntry(capture.lines()[0] ?? '');
    expect(entry.service).toBe('collab');
  });

  it('each log call produces exactly one line', () => {
    const logger = createLogger('svc');
    logger.info('one');
    logger.warn('two');
    logger.error('three');
    expect(capture.lines()).toHaveLength(3);
  });
});
