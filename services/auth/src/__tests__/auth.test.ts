import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildServer } from '../server.js';
import { buildConfig } from '../config.js';

// ── In-memory DB mock ─────────────────────────────────────────────────────────
// vi.mock is hoisted — db.ts and @prisma/client are never executed.

interface MockUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  role: string;
  oauthProvider: string | null;
  oauthProviderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface MockFamily {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

type WhereClause = Record<string, unknown>;

const userStore    = new Map<string, MockUser>();
const familyStore  = new Map<string, MockFamily>();

function matchesWhere(record: Record<string, unknown>, where: WhereClause): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === null) return record[k] === null;
    return record[k] === v;
  });
}

vi.mock('../db.js', () => ({
  db: {
    user: {
      findUnique: vi.fn((args: { where: WhereClause }) => {
        const hit = [...userStore.values()].find((u) =>
          matchesWhere(u as unknown as Record<string, unknown>, args.where),
        );
        return Promise.resolve(hit ?? null);
      }),
      create: vi.fn((args: { data: MockUser }) => {
        userStore.set(args.data.id, args.data);
        return Promise.resolve(args.data);
      }),
    },
    refreshTokenFamily: {
      findFirst: vi.fn((args: { where: WhereClause }) => {
        const hit = [...familyStore.values()].find((f) =>
          matchesWhere(f as unknown as Record<string, unknown>, args.where),
        );
        return Promise.resolve(hit ?? null);
      }),
      create: vi.fn((args: { data: MockFamily }) => {
        familyStore.set(args.data.id, args.data);
        return Promise.resolve(args.data);
      }),
      update: vi.fn((args: { where: { id: string }; data: Partial<MockFamily> }) => {
        const existing = familyStore.get(args.where.id);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, ...args.data } as MockFamily;
        familyStore.set(args.where.id, updated);
        return Promise.resolve(updated);
      }),
      updateMany: vi.fn((args: { where: WhereClause; data: Partial<MockFamily> }) => {
        let count = 0;
        for (const [id, family] of familyStore) {
          if (matchesWhere(family as unknown as Record<string, unknown>, args.where)) {
            familyStore.set(id, { ...family, ...args.data } as MockFamily);
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
    },
  },
}));

// ── Test setup ────────────────────────────────────────────────────────────────

const testConfig = buildConfig({
  DATABASE_URL:       'postgresql://test:test@localhost:5432/test',
  JWT_ACCESS_SECRET:  'test-access-secret-long-enough-for-hs256',
  JWT_REFRESH_SECRET: 'test-refresh-secret-long-enough-for-hs256',
  COOKIE_SECRET:      'test-cookie-secret-32-chars-minimum!!',
  SECURE_COOKIE:      'false',
});

let fastify: FastifyInstance;

beforeEach(async () => {
  userStore.clear();
  familyStore.clear();
  vi.clearAllMocks();
  fastify = await buildServer(testConfig);
  await fastify.ready();
});

afterEach(async () => {
  await fastify.close();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const REGISTER_BODY = {
  email:       'alice@example.com',
  password:    'correct-horse-battery',
  displayName: 'Alice',
};

function extractCookie(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : [raw ?? ''];
  const found = cookies.find((c) => c.startsWith('refresh_token='));
  if (!found) throw new Error('refresh_token cookie not set');
  return found;
}

function cookieValue(cookieHeader: string): string {
  return cookieHeader.split(';')[0]?.replace('refresh_token=', '') ?? '';
}

// ── POST /register ────────────────────────────────────────────────────────────

describe('POST /register', () => {
  it('creates a user and returns 201 with accessToken and user', async () => {
    const res = await supertest(fastify.server)
      .post('/register')
      .send(REGISTER_BODY);

    expect(res.status).toBe(201);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user.email).toBe(REGISTER_BODY.email);
    expect(res.body.user.displayName).toBe(REGISTER_BODY.displayName);
    expect(res.body.user.role).toBe('developer');
  });

  it('sets an httpOnly refresh_token cookie', async () => {
    const res = await supertest(fastify.server)
      .post('/register')
      .send(REGISTER_BODY);

    const cookie = extractCookie(res.headers as Record<string, string | string[]>);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('returns 409 when email is already registered', async () => {
    await supertest(fastify.server).post('/register').send(REGISTER_BODY);
    const res = await supertest(fastify.server).post('/register').send(REGISTER_BODY);
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid body (short password)', async () => {
    const res = await supertest(fastify.server)
      .post('/register')
      .send({ ...REGISTER_BODY, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid body (bad email)', async () => {
    const res = await supertest(fastify.server)
      .post('/register')
      .send({ ...REGISTER_BODY, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

// ── POST /login ───────────────────────────────────────────────────────────────

describe('POST /login', () => {
  beforeEach(async () => {
    await supertest(fastify.server).post('/register').send(REGISTER_BODY);
  });

  it('returns 200 with accessToken and user on valid credentials', async () => {
    const res = await supertest(fastify.server)
      .post('/login')
      .send({ email: REGISTER_BODY.email, password: REGISTER_BODY.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user.email).toBe(REGISTER_BODY.email);
  });

  it('sets a new refresh_token cookie on login', async () => {
    const res = await supertest(fastify.server)
      .post('/login')
      .send({ email: REGISTER_BODY.email, password: REGISTER_BODY.password });

    const cookie = extractCookie(res.headers as Record<string, string | string[]>);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('returns 401 for wrong password', async () => {
    const res = await supertest(fastify.server)
      .post('/login')
      .send({ email: REGISTER_BODY.email, password: 'wrong-password-here' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await supertest(fastify.server)
      .post('/login')
      .send({ email: 'nobody@example.com', password: REGISTER_BODY.password });
    expect(res.status).toBe(401);
  });

  it('issues a different accessToken on each login', async () => {
    const creds = { email: REGISTER_BODY.email, password: REGISTER_BODY.password };
    const r1 = await supertest(fastify.server).post('/login').send(creds);
    const r2 = await supertest(fastify.server).post('/login').send(creds);
    expect(r1.body.accessToken).not.toBe(r2.body.accessToken);
  });
});

// ── POST /refresh ─────────────────────────────────────────────────────────────

describe('POST /refresh', () => {
  let refreshCookie: string;

  beforeEach(async () => {
    const res = await supertest(fastify.server).post('/register').send(REGISTER_BODY);
    refreshCookie = extractCookie(res.headers as Record<string, string | string[]>);
  });

  it('returns 200 with a new accessToken when cookie is valid', async () => {
    const res = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('issues a new refresh_token cookie on each refresh', async () => {
    const res = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', refreshCookie);

    const newCookie = extractCookie(res.headers as Record<string, string | string[]>);
    expect(cookieValue(newCookie)).not.toBe(cookieValue(refreshCookie));
  });

  it('returns 401 when no cookie is present', async () => {
    const res = await supertest(fastify.server).post('/refresh');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a garbage cookie value', async () => {
    const res = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', 'refresh_token=not.a.real.jwt');
    expect(res.status).toBe(401);
  });

  it('detects token reuse and revokes the entire family', async () => {
    // Use the original cookie once — rotates to a new token
    const firstRefresh = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', refreshCookie);
    expect(firstRefresh.status).toBe(200);

    // Re-use the original (now-consumed) cookie — should detect reuse
    const reuseAttempt = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', refreshCookie);
    expect(reuseAttempt.status).toBe(401);

    // The new cookie from the first refresh should also be revoked now
    const newCookie = extractCookie(firstRefresh.headers as Record<string, string | string[]>);
    const afterRevoke = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', newCookie);
    expect(afterRevoke.status).toBe(401);
  });
});

// ── POST /logout ──────────────────────────────────────────────────────────────

describe('POST /logout', () => {
  let refreshCookie: string;

  beforeEach(async () => {
    const res = await supertest(fastify.server).post('/register').send(REGISTER_BODY);
    refreshCookie = extractCookie(res.headers as Record<string, string | string[]>);
  });

  it('returns 204 and clears the cookie', async () => {
    const res = await supertest(fastify.server)
      .post('/logout')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(204);
    const cookie = extractCookie(res.headers as Record<string, string | string[]>);
    expect(cookie).toMatch(/Max-Age=0/i);
  });

  it('returns 204 even when no cookie is present (idempotent)', async () => {
    const res = await supertest(fastify.server).post('/logout');
    expect(res.status).toBe(204);
  });

  it('invalidates the refresh token so subsequent refresh fails', async () => {
    await supertest(fastify.server)
      .post('/logout')
      .set('Cookie', refreshCookie);

    const res = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(401);
  });
});

// ── Full register → login → refresh → logout flow ────────────────────────────

describe('full auth flow', () => {
  it('completes register → login → refresh → logout sequence', async () => {
    // 1. Register
    const reg = await supertest(fastify.server).post('/register').send(REGISTER_BODY);
    expect(reg.status).toBe(201);
    const regCookie = extractCookie(reg.headers as Record<string, string | string[]>);
    const regAccessToken = reg.body.accessToken as string;

    // 2. Login (independent session)
    const login = await supertest(fastify.server)
      .post('/login')
      .send({ email: REGISTER_BODY.email, password: REGISTER_BODY.password });
    expect(login.status).toBe(200);
    const loginCookie = extractCookie(login.headers as Record<string, string | string[]>);
    const loginAccessToken = login.body.accessToken as string;

    // Tokens are unique across register and login
    expect(regAccessToken).not.toBe(loginAccessToken);

    // 3. Refresh using the login cookie
    const refresh = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', loginCookie);
    expect(refresh.status).toBe(200);
    const refreshAccessToken = refresh.body.accessToken as string;
    const refreshCookie = extractCookie(refresh.headers as Record<string, string | string[]>);

    expect(refreshAccessToken).not.toBe(loginAccessToken);
    expect(cookieValue(refreshCookie)).not.toBe(cookieValue(loginCookie));

    // 4. Logout with the rotated cookie
    const logout = await supertest(fastify.server)
      .post('/logout')
      .set('Cookie', refreshCookie);
    expect(logout.status).toBe(204);

    // 5. Refresh after logout → 401
    const afterLogout = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', refreshCookie);
    expect(afterLogout.status).toBe(401);

    // 6. The register-session cookie is a separate family — still valid
    const regRefresh = await supertest(fastify.server)
      .post('/refresh')
      .set('Cookie', regCookie);
    expect(regRefresh.status).toBe(200);
  });
});
