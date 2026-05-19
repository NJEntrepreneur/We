import { PluginRPCMessageSchema, type PluginRPCResponse } from '@platform/types';
import type { PermissionGate } from './PermissionGate.js';

const RPC_TIMEOUT_MS = 5_000;
// §5: reject oversized messages before schema parsing
const MAX_MESSAGE_BYTES = 1024 * 1024; // 1 MB

export type RpcHandler = (params: unknown) => Promise<unknown>;

interface PendingRpc {
  resolve: (value: unknown) => void;
  reject: (error: { code: string; message: string }) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export class MessageBridge {
  private readonly _pending = new Map<string, PendingRpc>();
  private readonly _handlers = new Map<string, RpcHandler>();
  private _listener: ((event: MessageEvent) => void) | null = null;

  constructor(
    // The contentWindow of the sandboxed iframe — used as the expected event.source.
    // Accepted as Window | null so the host can wait for iframe load before constructing.
    private readonly _pluginWindow: Window | null,
    private readonly _capabilityToken: string,
    private readonly _gate: PermissionGate,
    private readonly _pluginId: string,
  ) {}

  start(): void {
    this._listener = (event: MessageEvent) => { this._handleMessage(event); };
    window.addEventListener('message', this._listener);
  }

  stop(): void {
    if (this._listener !== null) {
      window.removeEventListener('message', this._listener);
      this._listener = null;
    }
    for (const pending of this._pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject({ code: 'BRIDGE_STOPPED', message: 'Plugin bridge was stopped' });
    }
    this._pending.clear();
  }

  registerHandler(method: string, handler: RpcHandler): void {
    this._handlers.set(method, handler);
  }

  // Host → plugin: send a request and await the plugin's response.
  sendRequest(method: string, params: unknown): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const id = globalThis.crypto.randomUUID();

      const timeoutId = setTimeout(() => {
        this._pending.delete(id);
        reject({
          code: 'RPC_TIMEOUT',
          message: `Plugin ${this._pluginId} did not respond to "${method}" within ${RPC_TIMEOUT_MS}ms`,
        });
      }, RPC_TIMEOUT_MS);

      this._pending.set(id, { resolve, reject, timeoutId });

      this._postToPlugin({
        type: 'request',
        payload: { id, method, params, capabilityToken: this._capabilityToken },
      });
    });
  }

  private _postToPlugin(message: unknown): void {
    // Must use '*' as target origin: sandboxed iframes have a null (opaque) origin,
    // and postMessage does not accept null as a target origin string.
    this._pluginWindow?.postMessage(message, '*');
  }

  private _handleMessage(event: MessageEvent): void {
    // §5: verify event.source — must be exactly our plugin's window reference
    if (this._pluginWindow === null || event.source !== this._pluginWindow) return;

    // §5: sandboxed iframes (no allow-same-origin) always emit origin 'null'.
    // Reject anything claiming a real origin — it did not come from our sandbox.
    if (event.origin !== 'null') return;

    // §5: resource limit — reject oversized payloads before parsing
    const raw = JSON.stringify(event.data);
    if (raw.length > MAX_MESSAGE_BYTES) return;

    const parsed = PluginRPCMessageSchema.safeParse(event.data);
    if (!parsed.success) return;

    const msg = parsed.data;
    if (msg.type === 'response') {
      this._handleResponse(msg.payload);
    } else {
      void this._handleRequest(msg.payload);
    }
  }

  private _handleResponse(response: PluginRPCResponse): void {
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

  private async _handleRequest(request: {
    id: string;
    method: string;
    params: unknown;
    capabilityToken: string;
  }): Promise<void> {
    // §5: verify scoped capability token
    if (request.capabilityToken !== this._capabilityToken) {
      this._sendErrorResponse(request.id, 'UNAUTHORIZED', 'Invalid capability token');
      return;
    }

    // §5: permission gate — check declared permissions before acting
    if (!this._gate.isAllowed(request.method)) {
      this._sendErrorResponse(
        request.id,
        'PERMISSION_DENIED',
        `Method "${request.method}" requires a permission not granted to plugin "${this._pluginId}"`,
      );
      return;
    }

    const handler = this._handlers.get(request.method);
    if (handler === undefined) {
      this._sendErrorResponse(request.id, 'METHOD_NOT_FOUND', `Unknown method: "${request.method}"`);
      return;
    }

    // §5: 5-second timeout per RPC call — enforced on the host handler too
    let result: unknown;
    try {
      result = await Promise.race([
        handler(request.params),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Handler for "${request.method}" exceeded ${RPC_TIMEOUT_MS}ms`)),
            RPC_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._sendErrorResponse(request.id, 'HANDLER_ERROR', message);
      return;
    }

    this._postToPlugin({
      type: 'response',
      payload: { id: request.id, result } satisfies PluginRPCResponse,
    });
  }

  private _sendErrorResponse(id: string, code: string, message: string): void {
    this._postToPlugin({
      type: 'response',
      payload: { id, error: { code, message } } satisfies PluginRPCResponse,
    });
  }
}
