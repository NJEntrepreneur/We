import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPluginSDK } from '../index.js';

describe('createPluginSDK', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an object with ready, call, and registerCommand', () => {
    const sdk = createPluginSDK();
    expect(typeof sdk.ready).toBe('function');
    expect(typeof sdk.call).toBe('function');
    expect(typeof sdk.registerCommand).toBe('function');
  });

  it('ready() posts a plugin.ready message to the parent', () => {
    const postMessageSpy = vi.spyOn(window.parent, 'postMessage');
    const sdk = createPluginSDK();
    void sdk.ready();
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'plugin.ready' }),
      '*',
    );
  });

  it('registerCommand handler is invoked on command.invoke messages', () => {
    const sdk = createPluginSDK();
    const handler = vi.fn();
    sdk.registerCommand('my-command', handler);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'command.invoke', commandId: 'my-command' },
        origin: window.location.origin,
      }),
    );

    expect(handler).toHaveBeenCalledOnce();
  });

  it('registerCommand does not invoke handler for different command IDs', () => {
    const sdk = createPluginSDK();
    const handler = vi.fn();
    sdk.registerCommand('my-command', handler);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'command.invoke', commandId: 'other-command' },
        origin: window.location.origin,
      }),
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it('call() rejects when SDK is not yet ready', async () => {
    const sdk = createPluginSDK();
    await expect(sdk.call('fs.read', {})).rejects.toThrow('SDK not ready');
  });
});
