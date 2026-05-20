import { SignJWT, jwtVerify } from 'jose';
import { PluginTokenPayloadSchema, type PluginTokenPayload, type PluginPermission } from '@platform/types';
import { randomId } from '@platform/utils';

export async function issuePluginToken(
  pluginId: string,
  workspaceId: string,
  permissions: PluginPermission[],
  secret: Uint8Array,
): Promise<string> {
  return new SignJWT({ pluginId, workspaceId, permissions })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(pluginId)
    .setJti(randomId())
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyPluginToken(
  token: string,
  secret: Uint8Array,
): Promise<PluginTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return PluginTokenPayloadSchema.parse(payload);
}
