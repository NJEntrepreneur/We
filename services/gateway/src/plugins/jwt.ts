import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { AccessTokenPayloadSchema, type AccessTokenPayload } from '@platform/types';

export async function verifyAccessToken(
  token: string,
  secret: Uint8Array,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return AccessTokenPayloadSchema.parse(payload);
}

export function createJwtPreHandler(secret: Uint8Array) {
  return async function jwtPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await reply.code(401).send({ error: 'Missing or malformed Authorization header' });
      return;
    }
    const token = authHeader.slice(7);
    try {
      request.accessTokenPayload = await verifyAccessToken(token, secret);
    } catch {
      await reply.code(401).send({ error: 'Invalid or expired token' });
    }
  };
}

export default fp(async function jwtPlugin(
  fastify: FastifyInstance,
  opts: { secret: Uint8Array },
) {
  fastify.decorate('jwtPreHandler', createJwtPreHandler(opts.secret));
});
