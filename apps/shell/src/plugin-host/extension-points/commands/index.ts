import type { CommandContribution } from '@platform/types';

export interface RegisteredCommand {
  pluginId: string;
  contribution: CommandContribution;
  handler: () => void;
}

export class CommandExtensionPoint {
  private readonly commands = new Map<string, RegisteredCommand>();

  register(pluginId: string, contribution: CommandContribution, handler: () => void): void {
    this.commands.set(`${pluginId}:${contribution.id}`, { pluginId, contribution, handler });
  }

  unregister(pluginId: string, commandId: string): void {
    this.commands.delete(`${pluginId}:${commandId}`);
  }

  unregisterAll(pluginId: string): void {
    for (const key of this.commands.keys()) {
      if (key.startsWith(`${pluginId}:`)) {
        this.commands.delete(key);
      }
    }
  }

  getAll(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  execute(pluginId: string, commandId: string): void {
    this.commands.get(`${pluginId}:${commandId}`)?.handler();
  }
}
