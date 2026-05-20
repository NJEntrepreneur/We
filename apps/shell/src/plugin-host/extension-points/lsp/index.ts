import type { LanguageProviderContribution } from '@platform/types';

export interface RegisteredLanguageProvider {
  pluginId: string;
  contribution: LanguageProviderContribution;
}

export class LspExtensionPoint {
  private readonly providers = new Map<string, RegisteredLanguageProvider>();

  register(pluginId: string, contribution: LanguageProviderContribution): void {
    const key = `${pluginId}:${contribution.language}:${contribution.provider}`;
    this.providers.set(key, { pluginId, contribution });
  }

  unregister(pluginId: string, language: string, provider: string): void {
    this.providers.delete(`${pluginId}:${language}:${provider}`);
  }

  unregisterAll(pluginId: string): void {
    for (const key of this.providers.keys()) {
      if (key.startsWith(`${pluginId}:`)) {
        this.providers.delete(key);
      }
    }
  }

  getAll(): RegisteredLanguageProvider[] {
    return Array.from(this.providers.values());
  }

  getByLanguage(language: string): RegisteredLanguageProvider[] {
    return this.getAll().filter((p) => p.contribution.language === language);
  }
}
