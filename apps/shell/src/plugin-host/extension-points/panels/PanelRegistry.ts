import type { PanelContribution } from '@platform/types';

// component is unknown here to keep the plugin-host free of React imports.
// The shell UI layer casts it to React.ComponentType when rendering.
export interface RegisteredPanel extends PanelContribution {
  component: unknown;
}

export class PanelRegistry {
  private readonly _panels = new Map<string, RegisteredPanel>();

  register(panel: RegisteredPanel): void {
    this._panels.set(panel.id, panel);
  }

  unregister(id: string): void {
    this._panels.delete(id);
  }

  get(id: string): RegisteredPanel | undefined {
    return this._panels.get(id);
  }

  list(): readonly RegisteredPanel[] {
    return [...this._panels.values()];
  }
}
