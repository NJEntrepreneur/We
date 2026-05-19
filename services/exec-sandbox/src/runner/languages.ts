export interface LanguageConfig {
  image: string;
  filename: string;
  cmd: string[];
}

// typescript uses a custom pre-built image with tsx installed (no network access in container).
export const LANGUAGE_CONFIGS = {
  javascript: {
    image: 'node:20-alpine',
    filename: 'code.js',
    cmd: ['node', '/app/code.js'],
  },
  typescript: {
    image: 'platform/sandbox-tsx',
    filename: 'code.ts',
    cmd: ['tsx', '/app/code.ts'],
  },
  python: {
    image: 'python:3.12-slim',
    filename: 'code.py',
    cmd: ['python', '/app/code.py'],
  },
  bash: {
    image: 'bash:5',
    filename: 'code.sh',
    cmd: ['bash', '/app/code.sh'],
  },
} as const satisfies Record<string, LanguageConfig>;

export type SupportedLanguage = keyof typeof LANGUAGE_CONFIGS;
