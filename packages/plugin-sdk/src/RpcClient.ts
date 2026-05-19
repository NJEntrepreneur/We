import { PluginRPCResponseSchema } from '@platform/types';
import type { RpcError } from './types.js';

const RPC_TIMEOUT_MS = 5_000;

interface PendingRpc {
  resolve: (value: unknown) => void;
  reject:  (error: RpcError) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

// Minimal shape of window.parent the RpcClient needs — injectable for tests.
export interface ParentWindow {
  postMessage(message: unknown, targetOrigin: string): void;
}

export class RpcClient {
  private readonly _pending = new Map<string, PendingRpc>();
  private _capabilityToken = '';
  private _listener: ((event: MessageEvent) => void) | null = null;
  private _started = false;

  // parentWindow defaults to window.parent (the host shell).
  // Pass a mock in tests to avoid touching the real window.parent.
  constructor(private readonly _parentWindow: ParentWindow = window.parent) {}

  start(capabilityToken: string): void {
    if (this._started) return;
    this._capabilityToken = capabilityToken;
    this._listener = (event: MessageEvent) => { this._handleMessage(event); };
    window.addEventListener('message', this._listener);
    this._started = true;
  }

  stop(): void {
    if (this._listener !== null) {
      window.removeEventListener('message', this._listener);
      this._listener = null;
    }
    this._started = false;
    for (const pending of this._pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject({ code: 'SDK_STOPPED', message: 'Plugin SDK was stopped' });
    }
    this._pending.clear();
  }

  call(method: string, params: unknown): Promise<unknown> {
    if (!this._started) {
      return Promise.reject<never>({
        code: 'NOT_READY',
        message: 'Call PluginSDK.ready() before making RPC calls',
      });
    }

    return new Promise<unknown>((resolve, reject) => {
      const id = globalThis.crypto.randomUUID();

      const timeoutId = setTimeout(() => {
        this._pending.delete(id);
        reject({
          code:    'RPC_TIMEOUT',
          message: `"${method}" timed out after ${RPC_TIMEOUT_MS}ms`,
        });
      }, RPC_TIMEOUT_MS);

      this._pending.set(id, { resolve, reject, timeoutId });

      // §5: all plugin→host communication via postMessage.
      // Must use '*' as target origin — plugin cannot read window.parent.origin
      // from inside a sandboxed iframe (no allow-same-origin).
      this._parentWindow.postMessage(
        {
          type: 'request',
          payload: { id, method, params, capabilityToken: this._capabilityToken },
        },
        '*',
      );
    });
  }

  private _handleMessage(event: MessageEvent): void {
    // Only process messages from the host (parent) window.
    // In a sandboxed iframe, event.source for host→plugin messages is window.parent.
    if (event.source !== (this._parentWindow as unknown as EventTarget)) return;

    const raw: unknown = event.data;
    if (
      typeof raw !== 'object' ||
      raw === null ||
      (raw as Record<string, unknown>)['type'] !== 'response'
    ) return;

    const parsed = PluginRPCResponseSchema.safeParse(
      (raw as Record<string, unknown>)['payload'],
    );
    if (!parsed.success) return;

    const response = parsed.data;
    const pending = this._pending.get(response.id);
    if (pending === undefined) return;

    clearTimeout(pending.timeoutId);
    this._pending.delete(response.id);

    if (response.error !== undefined) {
      pending.reject(response.error);
    } else {
      pending.resolve(response.result);
    }
  }
}
