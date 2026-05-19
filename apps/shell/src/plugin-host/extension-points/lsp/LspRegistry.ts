import type { LanguageProviderContribution } from '@platform/types';

export type LspHandler = (...args: unknown[]) => Promise<unknown>;

export interface RegisteredLspProvider extends LanguageProviderContribution {
  handler: LspHandler;
}

// Keyed as "<language>:<provider>" for uniqueness within a single language.
function lspKey(language: string, provider: string): string {
  return `${language}:${provider}`;
}

export class LspRegistry {
  private readonly _providers = new Map<string, RegisteredLspProvider>();

  register(provider: RegisteredLspProvider): void {
    this._providers.set(lspKey(provider.language, provider.provider), provider);
  }

  unregister(language: string, provider: RegisteredLspProvider['provider']): void {
    this._providers.delete(lspKey(language, provider));
  }

  get(language: string, provider: RegisteredLspProvider['provider']): RegisteredLspProvider | undefined {
    return this._providers.get(lspKey(language, provider));
  }

  list(): readonly RegisteredLspProvider[] {
    return [...this._providers.values()];
  }
}
