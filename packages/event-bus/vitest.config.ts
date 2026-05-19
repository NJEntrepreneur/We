import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Resolve workspace alias to source during test runs (no build step needed)
      '@platform/types': fileURLToPath(
        new URL('../sdk-types/src/index.ts', import.meta.url),
      ),
    },
  },
});
