import { z } from 'zod';
import { RpcClient, type ParentWindow } from './RpcClient.js';
import {
  FsReadResultSchema,     type FsReadResult,
  FsWriteResultSchema,    type FsWriteResult,
  TerminalSpawnResultSchema, type TerminalSpawnResult, type TerminalSpawnParams,
  NetworkFetchResultSchema,  type NetworkFetchResult,  type NetworkFetchParams,
  EditorDecorateResultSchema, type EditorDecorateResult, type Decoration,
  EditorCommandResultSchema,  type EditorCommandResult,
  UiPanelResultSchema,    type UiPanelResult,          type UiPanelRegisterParams,
  SettingsReadResultSchema,   type SettingsReadResult,
  SettingsWriteResultSchema,  type SettingsWriteResult,
} from './types.js';

// ── Internal helper ───────────────────────────────────────────────────────────

// Validates the unknown result returned by the host with a Zod schema.
// Using .parse() (not as-cast) so shape mismatches surface as runtime errors.
async function validated<T>(schema: z.ZodType<T>, promise: Promise<unknown>): Promise<T> {
  const raw = await promise;
  return schema.parse(raw);
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface FsNamespace {
  /** Read the contents of a workspace file. Requires `fs.read` permission. */
  read(path: string): Promise<FsReadResult>;
  /** Write content to a workspace file. Requires `fs.write` permission. */
  write(path: string, content: string): Promise<FsWriteResult>;
}

export interface TerminalNamespace {
  /** Open a terminal panel and spawn a process. Requires `terminal.spawn` permission. */
  spawn(command: string, options?: Omit<TerminalSpawnParams, 'command'>): Promise<TerminalSpawnResult>;
}

export interface NetworkNamespace {
  /** Make an outbound HTTP request via the host proxy. Requires `network.fetch` permission. */
  fetch(url: string, options?: Omit<NetworkFetchParams, 'url'>): Promise<NetworkFetchResult>;
}

export interface EditorCommandsNamespace {
  /** Register a command in the command palette. Requires `editor.commands` permission. */
  register(id: string, title: string, description?: string): Promise<EditorCommandResult>;
  /** Remove a previously registered command. Requires `editor.commands` permission. */
  unregister(id: string): Promise<EditorCommandResult>;
}

export interface EditorNamespace {
  /** Add visual decorations to the editor. Requires `editor.decorate` permission. */
  decorate(decorations: Decoration[]): Promise<EditorDecorateResult>;
  readonly commands: EditorCommandsNamespace;
}

export interface UiPanelNamespace {
  /** Register a sidebar or bottom panel. Requires `ui.panel` permission. */
  register(params: UiPanelRegisterParams): Promise<UiPanelResult>;
}

export interface UiNamespace {
  readonly panel: UiPanelNamespace;
}

export interface SettingsNamespace {
  /** Read plugin settings. Requires `settings.read` permission. */
  read(): Promise<SettingsReadResult>;
  /** Write a value to plugin settings. Requires `settings.write` permission. */
  write(key: string, value: unknown): Promise<SettingsWriteResult>;
}

// ── SDK class ─────────────────────────────────────────────────────────────────

export class PluginSDK {
  private readonly _client: RpcClient;
  private _initialized = false;

  constructor(parentWindow?: ParentWindow) {
    this._client = new RpcClient(parentWindow);
  }

  // §5 lifecycle step 6: plugin signals readiness and stores capability token.
  // Must be called before any RPC method. Idempotent on repeated calls.
  ready(capabilityToken: string): Promise<void> {
    if (!this._initialized) {
      this._client.start(capabilityToken);
      this._initialized = true;
    }
    return Promise.resolve();
  }

  // Tears down the message listener and rejects all pending RPCs.
  dispose(): void {
    this._client.stop();
    this._initialized = false;
  }

  // ── fs ─────────────────────────────────────────────────────────────────────

  readonly fs: FsNamespace = {
    read: (path: string): Promise<FsReadResult> =>
      validated(FsReadResultSchema, this._client.call('fs.read', { path })),

    write: (path: string, content: string): Promise<FsWriteResult> =>
      validated(FsWriteResultSchema, this._client.call('fs.write', { path, content })),
  };

  // ── terminal ───────────────────────────────────────────────────────────────

  readonly terminal: TerminalNamespace = {
    spawn: (
      command: string,
      options?: Omit<TerminalSpawnParams, 'command'>,
    ): Promise<TerminalSpawnResult> =>
      validated(
        TerminalSpawnResultSchema,
        this._client.call('terminal.spawn', { command, ...options }),
      ),
  };

  // ── network ────────────────────────────────────────────────────────────────

  readonly network: NetworkNamespace = {
    fetch: (
      url: string,
      options?: Omit<NetworkFetchParams, 'url'>,
    ): Promise<NetworkFetchResult> =>
      validated(
        NetworkFetchResultSchema,
        this._client.call('network.fetch', { url, ...options }),
      ),
  };

  // ── editor ─────────────────────────────────────────────────────────────────

  readonly editor: EditorNamespace = {
    decorate: (decorations: Decoration[]): Promise<EditorDecorateResult> =>
      validated(
        EditorDecorateResultSchema,
        this._client.call('editor.decorate', { decorations }),
      ),

    commands: {
      register: (
        id: string,
        title: string,
        description?: string,
      ): Promise<EditorCommandResult> =>
        validated(
          EditorCommandResultSchema,
          this._client.call('editor.commands.register', { id, title, description }),
        ),

      unregister: (id: string): Promise<EditorCommandResult> =>
        validated(
          EditorCommandResultSchema,
          this._client.call('editor.commands.unregister', { id }),
        ),
    },
  };

  // ── ui ─────────────────────────────────────────────────────────────────────

  readonly ui: UiNamespace = {
    panel: {
      register: (params: UiPanelRegisterParams): Promise<UiPanelResult> =>
        validated(UiPanelResultSchema, this._client.call('ui.panel.register', params)),
    },
  };

  // ── settings ───────────────────────────────────────────────────────────────

  readonly settings: SettingsNamespace = {
    read: (): Promise<SettingsReadResult> =>
      validated(SettingsReadResultSchema, this._client.call('settings.read', {})),

    write: (key: string, value: unknown): Promise<SettingsWriteResult> =>
      validated(
        SettingsWriteResultSchema,
        this._client.call('settings.write', { key, value }),
      ),
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

// createPluginSDK is the primary API for plugin authors.
// In tests, pass a mock parentWindow to intercept postMessage calls.
export function createPluginSDK(parentWindow?: ParentWindow): PluginSDK {
  return new PluginSDK(parentWindow);
}
