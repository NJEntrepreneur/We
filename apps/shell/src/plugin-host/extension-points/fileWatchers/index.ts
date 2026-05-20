export interface FileWatcherRegistration {
  pluginId: string;
  pattern: string;
  handler: (filePath: string, event: 'change' | 'create' | 'delete') => void;
}

export class FileWatchersExtensionPoint {
  private readonly watchers: FileWatcherRegistration[] = [];

  register(registration: FileWatcherRegistration): void {
    this.watchers.push(registration);
  }

  unregisterAll(pluginId: string): void {
    const idx: number[] = [];
    for (let i = 0; i < this.watchers.length; i++) {
      if (this.watchers[i]?.pluginId === pluginId) idx.push(i);
    }
    for (let i = idx.length - 1; i >= 0; i--) {
      this.watchers.splice(idx[i]!, 1);
    }
  }

  notify(filePath: string, event: 'change' | 'create' | 'delete'): void {
    for (const watcher of this.watchers) {
      if (filePath.startsWith(watcher.pattern) || watcher.pattern === '*') {
        watcher.handler(filePath, event);
      }
    }
  }

  getAll(): FileWatcherRegistration[] {
    return [...this.watchers];
  }
}
