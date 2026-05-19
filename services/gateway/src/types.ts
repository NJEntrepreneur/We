import type { AccessTokenPayload } from '@platform/types';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    accessTokenPayload?: AccessTokenPayload;
  }
}
