import { z } from 'zod';
import {
  PluginRPCResponseSchema,
  PluginRPCRequestSchema,
  type PluginRPCRequest,
  type PluginPermission,
} from '@platform/types';

// ── Capability grant sent by the host after PluginSDK.ready() ─────────────────

const CapabilityGrantSchema = z.object({
  pluginId: z.string(),
  workspaceId: z.string().uuid(),
  permissions: z.array(z.string()),
  capabilityToken: z.string().min(1),
});

export type CapabilityGrant = z.infer<typeof CapabilityGrantSchema>;

// ── Incoming message shapes from the host ────────────────────────────────────

const CapabilityGrantMessageSchema = z.object({
  type: z.literal('capability-grant'),
  grant: CapabilityGrantSchema,
});

const ResponseMessageSchema = z.object({
  type: z.literal('response'),
  payload: PluginRPCResponseSchema,
});

const CommandInvokeMessageSchema = z.object({
  type: z.literal('command.invoke'),
  commandId: z.string(),
});

const HostMessageSchema = z.discriminatedUnion('type', [
  CapabilityGrantMessageSchema,
  ResponseMessageSchema,
  CommandInvokeMessageSchema,
]);

// ── RPC call options ─────────────────────────────────────────────────────────

export interface CallOptions {
  timeoutMs?: number;
}

// ── Public SDK interface exposed to plugin authors ───────────────────────────

export interface PluginSDK {
  /**
   * Signal that the plugin is ready to receive messages.
   * The host responds with a CapabilityGrant confirming token + permissions.
   */
  ready(): Promise<CapabilityGrant>;

  /**
   * Invoke an RPC method on the host.
   * Throws if the method is not covered by the plugin's declared permissions,
   * or if the host returns an error response.
   */
  call(method: string, params: unknown, options?: CallOptions): Promise<unknown>;

  /**
   * Register a command contribution in the host command palette.
   * Requires the `editor.commands` permission.
   */
  registerCommand(id: string, handler: () => void): void;
}

// ── Pending-call bookkeeping ─────────────────────────────────────────────────

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a PluginSDK instance wired to `globalThis` postMessage.
 * Call this once at plugin startup before any other SDK usage.
 */
export function createPluginSDK(): PluginSDK {
  const pending = new Map<string, PendingCall>();
  const commandHandlers = new Map<string, () => void>();
  let grant: CapabilityGrant | null = null;

  function generateId(): string {
    return globalThis.crypto.randomUUID();
  }

  globalThis.addEventListener('message', (event: MessageEvent) => {
    const parsed = HostMessageSchema.safeParse(event.data);
    if (!parsed.success) return;

    const msg = parsed.data;

    if (msg.type === 'capability-grant') {
      const readyCall = pending.get('__ready__');
      if (readyCall) {
        clearTimeout(readyCall.timer);
        pending.delete('__ready__');
        grant = msg.grant;
        readyCall.resolve(grant);
      }
      return;
    }

    if (msg.type === 'response') {
      const { id } = msg.payload;
      const call = pending.get(id);
      if (!call) return;
      clearTimeout(call.timer);
      pending.delete(id);
      if (msg.payload.error) {
        call.reject(new Error(`${msg.payload.error.code}: ${msg.payload.error.message}`));
      } else {
        call.resolve(msg.payload.result);
      }
      return;
    }

    if (msg.type === 'command.invoke') {
      commandHandlers.get(msg.commandId)?.();
    }
  });

  return {
    ready(): Promise<CapabilityGrant> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete('__ready__');
          reject(new Error('PluginSDK.ready() timed out'));
        }, 5000);
        pending.set('__ready__', {
          resolve: (v) => { resolve(CapabilityGrantSchema.parse(v)); },
          reject,
          timer,
        });
        globalThis.parent.postMessage({ type: 'plugin.ready' }, '*');
      });
    },

    call(method: string, params: unknown, options: CallOptions = {}): Promise<unknown> {
      if (!grant) {
        return Promise.reject(new Error('SDK not ready — call PluginSDK.ready() first'));
      }
      const id = generateId();
      const timeoutMs = options.timeoutMs ?? 5000;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`RPC call "${method}" timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        const request: PluginRPCRequest = {
          id,
          method,
          params,
          capabilityToken: grant!.capabilityToken,
        };
        globalThis.parent.postMessage({ type: 'request', payload: request }, '*');
      });
    },

    registerCommand(id: string, handler: () => void): void {
      commandHandlers.set(id, handler);
    },
  };
}

export type { PluginPermission };
