import type { PanelContribution } from '@platform/types';

export interface RegisteredPanel {
  pluginId: string;
  contribution: PanelContribution;
}

export class PanelExtensionPoint {
  private readonly panels = new Map<string, RegisteredPanel>();

  register(pluginId: string, contribution: PanelContribution): void {
    this.panels.set(`${pluginId}:${contribution.id}`, { pluginId, contribution });
  }

  unregister(pluginId: string, panelId: string): void {
    this.panels.delete(`${pluginId}:${panelId}`);
  }

  unregisterAll(pluginId: string): void {
    for (const key of this.panels.keys()) {
      if (key.startsWith(`${pluginId}:`)) {
        this.panels.delete(key);
      }
    }
  }

  getAll(): RegisteredPanel[] {
    return Array.from(this.panels.values());
  }

  getBySide(position: 'sidebar' | 'bottom'): RegisteredPanel[] {
    return this.getAll().filter((p) => p.contribution.position === position);
  }
}
