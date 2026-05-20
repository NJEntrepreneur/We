import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      PORT:                     '4004',
      REDIS_URL:                'redis://localhost:6379',
      SANDBOX_DOCKER_SOCKET:    '/var/run/docker.sock',
      SANDBOX_SECCOMP_PROFILE:  './profiles/sandbox.json',
      SANDBOX_WORKER_CONCURRENCY: '1',
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
