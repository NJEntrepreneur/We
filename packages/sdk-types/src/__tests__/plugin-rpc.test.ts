import { describe, it, expect } from 'vitest';
import {
  PluginRPCRequestSchema,
  PluginRPCResponseSchema,
  PluginRPCErrorSchema,
} from '../schemas/plugin-rpc';

const validRequestId  = '550e8400-e29b-41d4-a716-446655440000';
const validResponseId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('PluginRPCRequestSchema', () => {
  it('parses a valid request', () => {
    const result = PluginRPCRequestSchema.parse({
      id:              validRequestId,
      method:          'fs.read',
      params:          { path: '/workspace/file.ts' },
      capabilityToken: 'eyJhbGciOiJFUzI1NiJ9.payload.sig',
    });
    expect(result.id).toBe(validRequestId);
    expect(result.method).toBe('fs.read');
  });

  it('accepts null params', () => {
    expect(() =>
      PluginRPCRequestSchema.parse({
        id:              validRequestId,
        method:          'ping',
        params:          null,
        capabilityToken: 'token',
      }),
    ).not.toThrow();
  });

  it('rejects a non-UUID id', () => {
    expect(() =>
      PluginRPCRequestSchema.parse({
        id:              'not-a-uuid',
        method:          'fs.read',
        params:          {},
        capabilityToken: 'token',
      }),
    ).toThrow();
  });

  it('rejects an empty method', () => {
    expect(() =>
      PluginRPCRequestSchema.parse({
        id:              validRequestId,
        method:          '',
        params:          {},
        capabilityToken: 'token',
      }),
    ).toThrow();
  });

  it('rejects an empty capabilityToken', () => {
    expect(() =>
      PluginRPCRequestSchema.parse({
        id:              validRequestId,
        method:          'fs.read',
        params:          {},
        capabilityToken: '',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => PluginRPCRequestSchema.parse({ id: validRequestId })).toThrow();
  });
});

describe('PluginRPCErrorSchema', () => {
  it('parses a valid error', () => {
    const result = PluginRPCErrorSchema.parse({
      code:    'PERMISSION_DENIED',
      message: 'Plugin does not have fs.write permission',
    });
    expect(result.code).toBe('PERMISSION_DENIED');
  });

  it('rejects an empty code', () => {
    expect(() =>
      PluginRPCErrorSchema.parse({ code: '', message: 'error' }),
    ).toThrow();
  });

  it('rejects an empty message', () => {
    expect(() =>
      PluginRPCErrorSchema.parse({ code: 'ERR', message: '' }),
    ).toThrow();
  });
});

describe('PluginRPCResponseSchema', () => {
  it('parses a success response', () => {
    const result = PluginRPCResponseSchema.parse({
      id:     validResponseId,
      result: { contents: 'file contents' },
    });
    expect(result.id).toBe(validResponseId);
    expect(result.error).toBeUndefined();
  });

  it('parses an error response', () => {
    const result = PluginRPCResponseSchema.parse({
      id:    validResponseId,
      error: { code: 'NOT_FOUND', message: 'File not found' },
    });
    expect(result.error?.code).toBe('NOT_FOUND');
    expect(result.result).toBeUndefined();
  });

  it('parses a response with neither result nor error (e.g. void op)', () => {
    expect(() =>
      PluginRPCResponseSchema.parse({ id: validResponseId }),
    ).not.toThrow();
  });

  it('rejects a non-UUID id', () => {
    expect(() =>
      PluginRPCResponseSchema.parse({ id: 'bad-id', result: null }),
    ).toThrow();
  });
});
