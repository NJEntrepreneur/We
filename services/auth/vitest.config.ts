import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL:       'postgresql://test:test@localhost:5432/test',
      JWT_ACCESS_SECRET:  'test-access-secret-long-enough-for-hs256',
      JWT_REFRESH_SECRET: 'test-refresh-secret-long-enough-for-hs256',
      COOKIE_SECRET:      'test-cookie-secret-32-chars-minimum!!',
      SECURE_COOKIE:      'false',
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
