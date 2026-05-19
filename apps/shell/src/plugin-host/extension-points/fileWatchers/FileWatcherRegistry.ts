export type FileWatchEvent = 'created' | 'changed' | 'deleted';
export type FileWatchHandler = (filePath: string, event: FileWatchEvent) => void;

export interface RegisteredFileWatcher {
  id: string;
  glob: string;
  handler: FileWatchHandler;
}

export class FileWatcherRegistry {
  private readonly _watchers = new Map<string, RegisteredFileWatcher>();

  register(watcher: RegisteredFileWatcher): void {
    this._watchers.set(watcher.id, watcher);
  }

  unregister(id: string): void {
    this._watchers.delete(id);
  }

  get(id: string): RegisteredFileWatcher | undefined {
    return this._watchers.get(id);
  }

  list(): readonly RegisteredFileWatcher[] {
    return [...this._watchers.values()];
  }

  notify(filePath: string, event: FileWatchEvent): void {
    for (const watcher of this._watchers.values()) {
      if (matchesGlob(filePath, watcher.glob)) {
        watcher.handler(filePath, event);
      }
    }
  }
}

// Minimal glob matcher: supports * (any chars except /) and ** (any chars including /)
function matchesGlob(filePath: string, glob: string): boolean {
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*');
  return new RegExp(`^${regexStr}$`).test(filePath);
}
