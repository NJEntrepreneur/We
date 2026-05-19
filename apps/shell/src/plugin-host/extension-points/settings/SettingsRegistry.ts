export interface SettingsContribution {
  id: string;
  // JSON Schema fragment describing the settings this plugin contributes
  schema: Record<string, unknown>;
  defaults: Record<string, unknown>;
}

export class SettingsRegistry {
  private readonly _contributions = new Map<string, SettingsContribution>();

  register(contribution: SettingsContribution): void {
    this._contributions.set(contribution.id, contribution);
  }

  unregister(id: string): void {
    this._contributions.delete(id);
  }

  get(id: string): SettingsContribution | undefined {
    return this._contributions.get(id);
  }

  list(): readonly SettingsContribution[] {
    return [...this._contributions.values()];
  }
}
