import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
    env: {
      PORT:     '4006',
      HOST:     '127.0.0.1',
    },
  },
  resolve: {
    alias: {
      '@platform/types': fileURLToPath(
        new URL('../../packages/sdk-types/src/index.ts', import.meta.url),
      ),
      '@platform/utils': fileURLToPath(
        new URL('../../packages/utils/src/index.ts', import.meta.url),
      ),
    },
  },
});
