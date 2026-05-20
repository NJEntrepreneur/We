import type { ThemeContribution } from '@platform/types';

export interface RegisteredTheme {
  pluginId: string;
  contribution: ThemeContribution;
}

export class ThemeExtensionPoint {
  private readonly themes = new Map<string, RegisteredTheme>();

  register(pluginId: string, contribution: ThemeContribution): void {
    this.themes.set(`${pluginId}:${contribution.id}`, { pluginId, contribution });
  }

  unregister(pluginId: string, themeId: string): void {
    this.themes.delete(`${pluginId}:${themeId}`);
  }

  unregisterAll(pluginId: string): void {
    for (const key of this.themes.keys()) {
      if (key.startsWith(`${pluginId}:`)) {
        this.themes.delete(key);
      }
    }
  }

  getAll(): RegisteredTheme[] {
    return Array.from(this.themes.values());
  }
}
