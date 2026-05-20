import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL:       'postgresql://test:test@localhost:5432/test',
      JWT_PLUGIN_SECRET:  'test-plugin-secret-long-enough-for-hs256',
      S3_ACCESS_KEY_ID:   'minioadmin',
      S3_SECRET_ACCESS_KEY: 'minioadmin',
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
