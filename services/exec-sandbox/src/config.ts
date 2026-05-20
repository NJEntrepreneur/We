import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env) {
  const cfg = createConfigReader(source);
  return {
    port:            cfg.port('PORT', 4004),
    host:            cfg.withDefault('HOST', '0.0.0.0'),
    redisUrl:        cfg.withDefault('REDIS_URL', 'redis://localhost:6379'),
    dockerSocket:    cfg.withDefault('SANDBOX_DOCKER_SOCKET', '/var/run/docker.sock'),
    seccompProfile:  cfg.withDefault('SANDBOX_SECCOMP_PROFILE', './profiles/sandbox.json'),
    workerConcurrency: cfg.integer('SANDBOX_WORKER_CONCURRENCY', 4),
  } as const;
}

export type SandboxConfig = ReturnType<typeof buildConfig>;
