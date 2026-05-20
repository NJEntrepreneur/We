import type { ThemeContribution } from '@platform/types';

export interface RegisteredTheme extends ThemeContribution {
  colors: Record<string, string>;
}

export class ThemeRegistry {
  private readonly _themes = new Map<string, RegisteredTheme>();

  register(theme: RegisteredTheme): void {
    this._themes.set(theme.id, theme);
  }

  unregister(id: string): void {
    this._themes.delete(id);
  }

  get(id: string): RegisteredTheme | undefined {
    return this._themes.get(id);
  }

  list(): readonly RegisteredTheme[] {
    return [...this._themes.values()];
  }
}
