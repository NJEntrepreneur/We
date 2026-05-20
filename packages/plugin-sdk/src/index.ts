// Main entry point for plugin authors.
// §17: zero Node.js dependencies — every export runs in the browser sandbox.

export { PluginSDK, createPluginSDK } from './PluginSDK.js';
export type {
  FsNamespace,
  TerminalNamespace,
  NetworkNamespace,
  EditorCommandsNamespace,
  EditorNamespace,
  UiPanelNamespace,
  UiNamespace,
  SettingsNamespace,
} from './PluginSDK.js';

export { RpcClient } from './RpcClient.js';
export type { ParentWindow } from './RpcClient.js';

export type {
  RpcError,
  FsReadParams,     FsReadResult,
  FsWriteParams,    FsWriteResult,
  TerminalSpawnParams, TerminalSpawnResult,
  NetworkFetchParams,  NetworkFetchResult,
  DecorationRange,  Decoration,
  EditorDecorateParams, EditorDecorateResult,
  EditorCommandRegisterParams, EditorCommandResult, EditorCommandUnregisterParams,
  UiPanelRegisterParams, UiPanelResult,
  SettingsReadResult,
  SettingsWriteParams, SettingsWriteResult,
} from './types.js';

export {
  FsReadParamsSchema,     FsReadResultSchema,
  FsWriteParamsSchema,    FsWriteResultSchema,
  TerminalSpawnParamsSchema, TerminalSpawnResultSchema,
  NetworkFetchParamsSchema,  NetworkFetchResultSchema,
  DecorationRangeSchema,  DecorationSchema,
  EditorDecorateParamsSchema, EditorDecorateResultSchema,
  EditorCommandRegisterParamsSchema, EditorCommandResultSchema, EditorCommandUnregisterParamsSchema,
  UiPanelRegisterParamsSchema, UiPanelResultSchema,
  SettingsReadResultSchema,
  SettingsWriteParamsSchema, SettingsWriteResultSchema,
} from './types.js';
