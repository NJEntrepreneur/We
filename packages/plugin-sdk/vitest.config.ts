import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@platform/types': fileURLToPath(
        new URL('../sdk-types/src/index.ts', import.meta.url),
      ),
    },
  },
});
