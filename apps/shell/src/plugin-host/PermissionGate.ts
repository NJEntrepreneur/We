import type { PluginPermission } from '@platform/types';

// §5: maps RPC method prefixes to the permission they require.
// A method like "fs.read.path" requires the "fs.read" permission.
// Methods not matching any prefix are denied by default.
const PERMISSION_PREFIXES: ReadonlyArray<readonly [string, PluginPermission]> = [
  ['fs.read',         'fs.read'],
  ['fs.write',        'fs.write'],
  ['terminal.spawn',  'terminal.spawn'],
  ['network.fetch',   'network.fetch'],
  ['editor.decorate', 'editor.decorate'],
  ['editor.commands', 'editor.commands'],
  ['ui.panel',        'ui.panel'],
  ['settings.read',   'settings.read'],
  ['settings.write',  'settings.write'],
];

export class PermissionGate {
  private readonly _granted: ReadonlySet<PluginPermission>;

  constructor(permissions: readonly PluginPermission[]) {
    this._granted = new Set(permissions);
  }

  isAllowed(method: string): boolean {
    for (const [prefix, permission] of PERMISSION_PREFIXES) {
      if (method === prefix || method.startsWith(`${prefix}.`)) {
        return this._granted.has(permission);
      }
    }
    return false;
  }

  has(permission: PluginPermission): boolean {
    return this._granted.has(permission);
  }

  granted(): readonly PluginPermission[] {
    return [...this._granted];
  }
}
