import type { PluginManifest } from '@platform/types';
import type { EventBus } from '@platform/events';
import { SandboxLoader } from './SandboxLoader.js';
import { MessageBridge } from './MessageBridge.js';
import { PermissionGate } from './PermissionGate.js';
import {
  CommandRegistry,
  PanelRegistry,
  ThemeRegistry,
  LspRegistry,
  FileWatcherRegistry,
  SettingsRegistry,
} from './extension-points/index.js';

interface ActivePlugin {
  readonly manifest: PluginManifest;
  readonly iframe: HTMLIFrameElement;
  readonly bridge: MessageBridge;
}

export class PluginHost {
  // §5: extension points exposed for the shell UI to consume
  readonly commands   = new CommandRegistry();
  readonly panels     = new PanelRegistry();
  readonly themes     = new ThemeRegistry();
  readonly lsp        = new LspRegistry();
  readonly fileWatchers = new FileWatcherRegistry();
  readonly settings   = new SettingsRegistry();

  private readonly _active = new Map<string, ActivePlugin>();

  constructor(
    private readonly _container: HTMLElement,
    private readonly _bus: EventBus,
  ) {}

  // §5 lifecycle step 2–5: validate+verify happens at the registry service;
  // here we trust the caller already has a valid manifest + signed capabilityToken.
  loadPlugin(
    manifest: PluginManifest,
    bundleUrl: string,
    capabilityToken: string,
  ): void {
    if (this._active.has(manifest.id)) return;

    const { iframe } = SandboxLoader.create(bundleUrl, this._container);
    const gate = new PermissionGate(manifest.permissions);
    const bridge = new MessageBridge(
      iframe.contentWindow,
      capabilityToken,
      gate,
      manifest.id,
    );

    this._registerExtensionHandlers(bridge, manifest.id, gate);
    bridge.start();

    this._active.set(manifest.id, { manifest, iframe, bridge });

    // §5 lifecycle step 6 & §11 event bus
    this._bus.emit('plugin.activated', {
      pluginId: manifest.id,
      version:  manifest.version,
    });
  }

  // §5 lifecycle step 8: send plugin.deactivate then destroy the iframe
  async unloadPlugin(pluginId: string, reason = 'uninstalled'): Promise<void> {
    const plugin = this._active.get(pluginId);
    if (plugin === undefined) return;

    // Best-effort deactivation signal — plugin may not respond
    try {
      await plugin.bridge.sendRequest('plugin.deactivate', { reason });
    } catch {
      // Ignored: bridge may already be unresponsive
    }

    plugin.bridge.stop();
    SandboxLoader.destroy({ iframe: plugin.iframe, origin: 'null' });

    this._active.delete(pluginId);

    this._bus.emit('plugin.deactivated', { pluginId, reason });
  }

  isActive(pluginId: string): boolean {
    return this._active.has(pluginId);
  }

  activePluginIds(): readonly string[] {
    return [...this._active.keys()];
  }

  // Register host-side RPC handlers wired to the extension point registries.
  // The bridge's permission gate blocks anything not in the manifest before
  // reaching these handlers, so handlers can trust the caller is authorized.
  private _registerExtensionHandlers(
    bridge: MessageBridge,
    pluginId: string,
    gate: PermissionGate,
  ): void {
    // editor.commands — register a command contribution
    if (gate.has('editor.commands')) {
      bridge.registerHandler('editor.commands.register', (params) => {
        const p = params as { id: string; title: string; description?: string };
        this.commands.register({
          id:          `${pluginId}::${p.id}`,
          title:       p.title,
          description: p.description,
          handler:     () => {
            void bridge.sendRequest('editor.commands.execute', { commandId: p.id });
          },
        });
        return Promise.resolve({ ok: true });
      });

      bridge.registerHandler('editor.commands.unregister', (params) => {
        const p = params as { id: string };
        this.commands.unregister(`${pluginId}::${p.id}`);
        return Promise.resolve({ ok: true });
      });
    }

    // ui.panel — register a panel contribution
    if (gate.has('ui.panel')) {
      bridge.registerHandler('ui.panel.register', (params) => {
        const p = params as {
          id: string;
          title: string;
          icon?: string;
          position: 'sidebar' | 'bottom';
        };
        this.panels.register({
          id:        `${pluginId}::${p.id}`,
          title:     p.title,
          icon:      p.icon,
          position:  p.position,
          component: null, // Actual component is provided by the plugin SDK side
        });
        return Promise.resolve({ ok: true });
      });
    }

    // settings.read
    if (gate.has('settings.read')) {
      bridge.registerHandler('settings.read', (_params) => {
        return Promise.resolve({});
      });
    }

    // settings.write
    if (gate.has('settings.write')) {
      bridge.registerHandler('settings.write', (params) => {
        const p = params as { key: string; value: unknown };
        const contribution = this.settings.get(pluginId);
        if (contribution === undefined) {
          return Promise.reject(new Error('Plugin has no registered settings contribution'));
        }
        if (!(p.key in contribution.schema)) {
          return Promise.reject(new Error(`Unknown settings key: ${p.key}`));
        }
        return Promise.resolve({ ok: true });
      });
    }
  }
}
