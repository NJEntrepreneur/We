import { z } from 'zod';

export interface SettingsContribution {
  pluginId: string;
  namespace: string;
  schema: z.ZodSchema<unknown>;
  defaults: Record<string, unknown>;
}

export class SettingsExtensionPoint {
  private readonly contributions = new Map<string, SettingsContribution>();
  private readonly values = new Map<string, Record<string, unknown>>();

  register(contribution: SettingsContribution): void {
    this.contributions.set(contribution.pluginId, contribution);
    if (!this.values.has(contribution.pluginId)) {
      this.values.set(contribution.pluginId, { ...contribution.defaults });
    }
  }

  unregister(pluginId: string): void {
    this.contributions.delete(pluginId);
  }

  get(pluginId: string): Record<string, unknown> {
    return this.values.get(pluginId) ?? {};
  }

  set(pluginId: string, updates: Record<string, unknown>): void {
    const contribution = this.contributions.get(pluginId);
    if (!contribution) return;
    const merged = { ...this.get(pluginId), ...updates };
    contribution.schema.parse(merged);
    this.values.set(pluginId, merged);
  }

  getAll(): SettingsContribution[] {
    return Array.from(this.contributions.values());
  }
}
