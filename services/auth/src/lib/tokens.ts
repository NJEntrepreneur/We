import { SignJWT, jwtVerify } from 'jose';
import {
  AccessTokenPayloadSchema,
  RefreshTokenPayloadSchema,
  type AccessTokenPayload,
  type RefreshTokenPayload,
} from '@platform/types';
import type { Role } from '@platform/types';
import { randomId } from '@platform/utils';

export async function issueAccessToken(
  userId: string,
  role: Role,
  secret: Uint8Array,
): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(randomId())
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function issueRefreshToken(
  userId: string,
  familyId: string,
  secret: Uint8Array,
): Promise<{ token: string; jti: string }> {
  const jti = randomId();
  const token = await new SignJWT({ familyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  return { token, jti };
}

export async function verifyAccessToken(
  token: string,
  secret: Uint8Array,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return AccessTokenPayloadSchema.parse(payload);
}

export async function verifyRefreshToken(
  token: string,
  secret: Uint8Array,
): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return RefreshTokenPayloadSchema.parse(payload);
}
