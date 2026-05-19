import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, type ZodSchema } from 'zod';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  type AuthUser,
} from '@platform/types';
import { hash, randomId, createLogger } from '@platform/utils';
import { Role } from '@platform/types';

async function parseBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
  reply: FastifyReply,
): Promise<T | null> {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      await reply.code(400).send({ error: 'Validation error', issues: err.issues });
      return null;
    }
    throw err;
  }
}
import { db } from '../db.js';
import { hashPassword } from '../lib/password.js';
import { findAndVerifyUser } from '../strategies/local.js';
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from '../lib/tokens.js';
import type { AuthConfig } from '../config.js';

const logger = createLogger('auth');
const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/';

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setRefreshCookie(
  reply: FastifyReply,
  token: string,
  secure: boolean,
): void {
  void reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

function clearRefreshCookie(reply: FastifyReply): void {
  void reply.setCookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

// ── Route registration ────────────────────────────────────────────────────────

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  config: AuthConfig,
): Promise<void> {
  const accessSecret = new TextEncoder().encode(config.jwtAccessSecret);
  const refreshSecret = new TextEncoder().encode(config.jwtRefreshSecret);

  // ── POST /register ──────────────────────────────────────────────────────────
  fastify.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = await parseBody(RegisterRequestSchema, request.body, reply);
      if (body === null) return;

      const existing = await db.user.findUnique({ where: { email: body.email } });
      if (existing !== null) {
        await reply.code(409).send({ error: 'Email already registered' });
        return;
      }

      const userId = randomId();
      const passwordHash = await hashPassword(body.password);
      const now = new Date();

      const user = await db.user.create({
        data: {
          id:           userId,
          email:        body.email,
          displayName:  body.displayName,
          passwordHash,
          role:         'developer',
          createdAt:    now,
          updatedAt:    now,
          deletedAt:    null,
        },
      });

      const familyId = randomId();
      const { token: refreshToken, jti } = await issueRefreshToken(userId, familyId, refreshSecret);
      const tokenHash = await hash('SHA-256', jti);

      await db.refreshTokenFamily.create({
        data: {
          id:        randomId(),
          userId,
          familyId,
          tokenHash,
          usedAt:    null,
          revokedAt: null,
          createdAt: now,
        },
      });

      const accessToken = await issueAccessToken(userId, user.role as Role, accessSecret);

      const authUser: AuthUser = {
        id:          user.id,
        email:       user.email,
        displayName: user.displayName,
        role:        user.role as Role,
      };

      setRefreshCookie(reply, refreshToken, config.secureCookie);
      logger.info('User registered', { userId });
      await reply.code(201).send({ accessToken, user: authUser });
    },
  );

  // ── POST /login ─────────────────────────────────────────────────────────────
  fastify.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = await parseBody(LoginRequestSchema, request.body, reply);
      if (body === null) return;

      const user = await findAndVerifyUser(body.email, body.password, db);
      if (user === null) {
        await reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }

      const familyId = randomId();
      const { token: refreshToken, jti } = await issueRefreshToken(user.id, familyId, refreshSecret);
      const tokenHash = await hash('SHA-256', jti);
      const now = new Date();

      await db.refreshTokenFamily.create({
        data: {
          id:        randomId(),
          userId:    user.id,
          familyId,
          tokenHash,
          usedAt:    null,
          revokedAt: null,
          createdAt: now,
        },
      });

      const accessToken = await issueAccessToken(user.id, user.role as Role, accessSecret);

      const authUser: AuthUser = {
        id:          user.id,
        email:       user.email,
        displayName: user.displayName,
        role:        user.role as Role,
      };

      setRefreshCookie(reply, refreshToken, config.secureCookie);
      logger.info('User logged in', { userId: user.id });
      await reply.code(200).send({ accessToken, user: authUser });
    },
  );

  // ── POST /refresh ───────────────────────────────────────────────────────────
  fastify.post(
    '/refresh',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const rawToken = request.cookies[COOKIE_NAME];
      if (!rawToken) {
        await reply.code(401).send({ error: 'Missing refresh token' });
        return;
      }

      let payload;
      try {
        payload = await verifyRefreshToken(rawToken, refreshSecret);
      } catch {
        await reply.code(401).send({ error: 'Invalid refresh token' });
        return;
      }

      const tokenHash = await hash('SHA-256', payload.jti);
      const family = await db.refreshTokenFamily.findFirst({
        where: { tokenHash, revokedAt: null },
      });

      if (family === null) {
        await reply.code(401).send({ error: 'Refresh token revoked or not found' });
        return;
      }

      if (family.usedAt !== null) {
        // Reuse detected — invalidate entire family (§6)
        await db.refreshTokenFamily.updateMany({
          where: { familyId: family.familyId },
          data:  { revokedAt: new Date() },
        });
        logger.warn('Refresh token reuse detected — family revoked', {
          userId: payload.sub,
        });
        await reply.code(401).send({ error: 'Refresh token already used' });
        return;
      }

      // Mark current token as used
      await db.refreshTokenFamily.update({
        where: { id: family.id },
        data:  { usedAt: new Date() },
      });

      // Fetch user to get current role
      const user = await db.user.findUnique({ where: { id: payload.sub } });
      if (user === null || user.deletedAt !== null) {
        await reply.code(401).send({ error: 'User not found or deactivated' });
        return;
      }

      // Issue new token pair (same family)
      const { token: newRefreshToken, jti: newJti } = await issueRefreshToken(
        user.id,
        family.familyId,
        refreshSecret,
      );
      const newTokenHash = await hash('SHA-256', newJti);
      const now = new Date();

      await db.refreshTokenFamily.create({
        data: {
          id:        randomId(),
          userId:    user.id,
          familyId:  family.familyId,
          tokenHash: newTokenHash,
          usedAt:    null,
          revokedAt: null,
          createdAt: now,
        },
      });

      const accessToken = await issueAccessToken(user.id, user.role as Role, accessSecret);

      setRefreshCookie(reply, newRefreshToken, config.secureCookie);
      logger.info('Token refreshed', { userId: user.id });
      await reply.code(200).send({ accessToken });
    },
  );

  // ── POST /logout ────────────────────────────────────────────────────────────
  fastify.post(
    '/logout',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const rawToken = request.cookies[COOKIE_NAME];
      if (rawToken) {
        try {
          const payload = await verifyRefreshToken(rawToken, refreshSecret);
          const tokenHash = await hash('SHA-256', payload.jti);
          const family = await db.refreshTokenFamily.findFirst({
            where: { tokenHash },
          });
          if (family !== null) {
            await db.refreshTokenFamily.update({
              where: { id: family.id },
              data:  { revokedAt: new Date() },
            });
          }
        } catch {
          // Expired tokens are still cleared — logout is always successful
        }
      }

      clearRefreshCookie(reply);
      await reply.code(204).send();
    },
  );
}
