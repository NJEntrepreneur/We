import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
    env: {
      PORT:               '4005',
      DATABASE_URL:       'postgresql://test:test@localhost:5432/test',
      JWT_ACCESS_SECRET:  'test-access-secret-long-enough-for-hs256',
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
      '@platform/events': fileURLToPath(
        new URL('../../packages/event-bus/src/index.ts', import.meta.url),
      ),
    },
  },
});
