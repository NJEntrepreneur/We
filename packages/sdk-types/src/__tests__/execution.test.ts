import { describe, it, expect } from 'vitest';
import {
  ExecutionLanguageSchema,
  ExecutionRequestSchema,
  ExecutionResultSchema,
} from '../schemas/execution';

describe('ExecutionLanguageSchema', () => {
  const valid = ['javascript', 'typescript', 'python', 'bash'] as const;

  it('accepts all supported languages', () => {
    for (const lang of valid) {
      expect(() => ExecutionLanguageSchema.parse(lang)).not.toThrow();
    }
  });

  it('rejects unsupported languages', () => {
    expect(() => ExecutionLanguageSchema.parse('ruby')).toThrow();
    expect(() => ExecutionLanguageSchema.parse('Java')).toThrow();
    expect(() => ExecutionLanguageSchema.parse('')).toThrow();
  });
});

describe('ExecutionRequestSchema', () => {
  const base = { language: 'typescript' as const, code: 'console.log("hi")' };

  it('parses a minimal valid request', () => {
    const result = ExecutionRequestSchema.parse(base);
    expect(result.language).toBe('typescript');
    expect(result.code).toBe('console.log("hi")');
    expect(result.stdin).toBeUndefined();
    expect(result.timeoutMs).toBeUndefined();
    expect(result.env).toBeUndefined();
  });

  it('parses a fully-specified request', () => {
    const result = ExecutionRequestSchema.parse({
      language:  'python',
      code:      'print("hello")',
      stdin:     'world',
      timeoutMs: 5000,
      env:       { PYTHONPATH: '/lib' },
    });
    expect(result.timeoutMs).toBe(5000);
    expect(result.env).toEqual({ PYTHONPATH: '/lib' });
  });

  it('accepts timeoutMs of 1 (minimum)', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, timeoutMs: 1 }),
    ).not.toThrow();
  });

  it('accepts timeoutMs of 10000 (maximum)', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, timeoutMs: 10_000 }),
    ).not.toThrow();
  });

  it('rejects timeoutMs of 0', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, timeoutMs: 0 }),
    ).toThrow();
  });

  it('rejects timeoutMs of 10001', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, timeoutMs: 10_001 }),
    ).toThrow();
  });

  it('rejects a non-integer timeoutMs', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, timeoutMs: 500.5 }),
    ).toThrow();
  });

  it('rejects empty code', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, code: '' }),
    ).toThrow();
  });

  it('rejects an unsupported language', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ language: 'cobol', code: 'DISPLAY "hi"' }),
    ).toThrow();
  });

  it('rejects env with non-string values', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ ...base, env: { KEY: 123 } }),
    ).toThrow();
  });
});

describe('ExecutionResultSchema', () => {
  const base = { stdout: '', stderr: '', exitCode: 0, durationMs: 42 };

  it('parses a successful result', () => {
    const result = ExecutionResultSchema.parse({ ...base, stdout: 'hello\n' });
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBe(42);
  });

  it('accepts non-zero exit codes', () => {
    expect(() =>
      ExecutionResultSchema.parse({ ...base, exitCode: 1 }),
    ).not.toThrow();
    expect(() =>
      ExecutionResultSchema.parse({ ...base, exitCode: 127 }),
    ).not.toThrow();
    expect(() =>
      ExecutionResultSchema.parse({ ...base, exitCode: -1 }),
    ).not.toThrow();
  });

  it('accepts durationMs of 0', () => {
    expect(() =>
      ExecutionResultSchema.parse({ ...base, durationMs: 0 }),
    ).not.toThrow();
  });

  it('rejects negative durationMs', () => {
    expect(() =>
      ExecutionResultSchema.parse({ ...base, durationMs: -1 }),
    ).toThrow();
  });

  it('rejects a non-integer exitCode', () => {
    expect(() =>
      ExecutionResultSchema.parse({ ...base, exitCode: 0.5 }),
    ).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => ExecutionResultSchema.parse({ stdout: 'ok' })).toThrow();
  });
});
