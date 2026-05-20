import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env) {
  const cfg = createConfigReader(source);
  return {
    port:             cfg.port('PORT', 4003),
    host:             cfg.withDefault('HOST', '0.0.0.0'),
    redisUrl:         cfg.required('REDIS_URL'),
    dockerSocket:     cfg.withDefault('SANDBOX_DOCKER_SOCKET', '/var/run/docker.sock'),
    seccompProfile:   cfg.withDefault('SANDBOX_SECCOMP_PROFILE', './profiles/sandbox.json'),
    maxConcurrent:    cfg.integer('SANDBOX_MAX_CONCURRENT', 10),
  } as const;
}

export type SandboxConfig = ReturnType<typeof buildConfig>;
