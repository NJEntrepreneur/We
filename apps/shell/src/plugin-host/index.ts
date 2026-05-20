import { PluginRPCMessageSchema } from '@platform/types';
import { CommandExtensionPoint } from './extension-points/commands/index.js';
import { PanelExtensionPoint } from './extension-points/panels/index.js';
import { ThemeExtensionPoint } from './extension-points/themes/index.js';
import { LspExtensionPoint } from './extension-points/lsp/index.js';
import { FileWatchersExtensionPoint } from './extension-points/fileWatchers/index.js';
import { SettingsExtensionPoint } from './extension-points/settings/index.js';

export { CommandExtensionPoint } from './extension-points/commands/index.js';
export { PanelExtensionPoint } from './extension-points/panels/index.js';
export { ThemeExtensionPoint } from './extension-points/themes/index.js';
export { LspExtensionPoint } from './extension-points/lsp/index.js';
export { FileWatchersExtensionPoint } from './extension-points/fileWatchers/index.js';
export { SettingsExtensionPoint } from './extension-points/settings/index.js';

// ── Registered plugin entry ─────────────────────────────────────────────────

interface ActivePlugin {
  pluginId: string;
  iframe: HTMLIFrameElement;
  origin: string;
  capabilityToken: string;
  permissions: string[];
}

// ── Extension point registry (one set shared across all plugins) ─────────────

export interface ExtensionPoints {
  commands: CommandExtensionPoint;
  panels: PanelExtensionPoint;
  themes: ThemeExtensionPoint;
  lsp: LspExtensionPoint;
  fileWatchers: FileWatchersExtensionPoint;
  settings: SettingsExtensionPoint;
}

// ── Host ─────────────────────────────────────────────────────────────────────

export class PluginHost {
  readonly extensions: ExtensionPoints = {
    commands:     new CommandExtensionPoint(),
    panels:       new PanelExtensionPoint(),
    themes:       new ThemeExtensionPoint(),
    lsp:          new LspExtensionPoint(),
    fileWatchers: new FileWatchersExtensionPoint(),
    settings:     new SettingsExtensionPoint(),
  };

  private readonly plugins = new Map<string, ActivePlugin>();
  private readonly messageHandler: (event: MessageEvent) => void;

  constructor() {
    this.messageHandler = (event: MessageEvent) => { this.handleMessage(event); };
    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Load a plugin bundle into a sandboxed iframe.
   * The iframe sandbox attribute is `allow-scripts` only — never `allow-same-origin`.
   */
  loadPlugin(
    pluginId: string,
    bundleUrl: string,
    capabilityToken: string,
    permissions: string[],
  ): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    // §5: allow-scripts only — no allow-same-origin, no allow-storage-access
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.src = bundleUrl;

    const origin = new URL(bundleUrl).origin;
    this.plugins.set(pluginId, { pluginId, iframe, origin, capabilityToken, permissions });

    document.body.appendChild(iframe);
    return iframe;
  }

  /** Deactivate and destroy the plugin iframe. */
  unloadPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    this.extensions.commands.unregisterAll(pluginId);
    this.extensions.panels.unregisterAll(pluginId);
    this.extensions.themes.unregisterAll(pluginId);
    this.extensions.lsp.unregisterAll(pluginId);
    this.extensions.fileWatchers.unregisterAll(pluginId);
    this.extensions.settings.unregister(pluginId);

    plugin.iframe.remove();
    this.plugins.delete(pluginId);
  }

  destroy(): void {
    window.removeEventListener('message', this.messageHandler);
    for (const pluginId of this.plugins.keys()) {
      this.unloadPlugin(pluginId);
    }
  }

  private handleMessage(event: MessageEvent): void {
    // §5: verify event.origin on every message
    const plugin = this.findPluginByOrigin(event.origin);
    if (!plugin) return;

    const parsed = PluginRPCMessageSchema.safeParse(event.data);
    if (!parsed.success) return;

    const msg = parsed.data;
    if (msg.type !== 'request') return;

    const { id, method, capabilityToken } = msg.payload;

    // §5: validate capability token before acting
    if (capabilityToken !== plugin.capabilityToken) {
      this.sendError(plugin, id, 'FORBIDDEN', 'Invalid capability token');
      return;
    }

    // §5: validate against declared permissions
    const permission = method.split('.').slice(0, 2).join('.');
    if (!plugin.permissions.includes(permission)) {
      this.sendError(plugin, id, 'FORBIDDEN', `Permission not granted: ${permission}`);
      return;
    }

    // Dispatch to the appropriate handler
    this.dispatch(plugin, id, method, msg.payload.params);
  }

  private dispatch(
    plugin: ActivePlugin,
    id: string,
    method: string,
    _params: unknown,
  ): void {
    // Method routing to be expanded as RPC methods are implemented
    this.sendError(plugin, id, 'NOT_IMPLEMENTED', `Method not implemented: ${method}`);
  }

  private sendError(
    plugin: ActivePlugin,
    id: string,
    code: string,
    message: string,
  ): void {
    plugin.iframe.contentWindow?.postMessage(
      { type: 'response', payload: { id, error: { code, message } } },
      plugin.origin,
    );
  }

  private findPluginByOrigin(origin: string): ActivePlugin | undefined {
    for (const plugin of this.plugins.values()) {
      if (plugin.origin === origin) return plugin;
    }
    return undefined;
  }
}
