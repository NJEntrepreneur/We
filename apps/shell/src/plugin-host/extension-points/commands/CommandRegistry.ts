import type { CommandContribution } from '@platform/types';

export interface RegisteredCommand extends CommandContribution {
  handler: () => void;
}

export class CommandRegistry {
  private readonly _commands = new Map<string, RegisteredCommand>();

  register(command: RegisteredCommand): void {
    this._commands.set(command.id, command);
  }

  unregister(id: string): void {
    this._commands.delete(id);
  }

  get(id: string): RegisteredCommand | undefined {
    return this._commands.get(id);
  }

  list(): readonly RegisteredCommand[] {
    return [...this._commands.values()];
  }
}
