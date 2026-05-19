export { CommandRegistry } from './commands/CommandRegistry.js';
export type { RegisteredCommand } from './commands/CommandRegistry.js';

export { PanelRegistry } from './panels/PanelRegistry.js';
export type { RegisteredPanel } from './panels/PanelRegistry.js';

export { ThemeRegistry } from './themes/ThemeRegistry.js';
export type { RegisteredTheme } from './themes/ThemeRegistry.js';

export { LspRegistry } from './lsp/LspRegistry.js';
export type { RegisteredLspProvider, LspHandler } from './lsp/LspRegistry.js';

export { FileWatcherRegistry } from './fileWatchers/FileWatcherRegistry.js';
export type { RegisteredFileWatcher, FileWatchEvent, FileWatchHandler } from './fileWatchers/FileWatcherRegistry.js';

export { SettingsRegistry } from './settings/SettingsRegistry.js';
export type { SettingsContribution } from './settings/SettingsRegistry.js';
