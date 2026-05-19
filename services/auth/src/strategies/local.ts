import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import type { PrismaClient } from '@prisma/client';
import { verifyPassword } from '../lib/password.js';

// §6: passport-local strategy — used as the canonical verify function for /login.
// Route handlers call findAndVerifyUser directly (session: false JWT flow).

export interface LocalUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export async function findAndVerifyUser(
  email: string,
  password: string,
  db: PrismaClient,
): Promise<LocalUser | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt !== null) return null;
  if (!user.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export function registerLocalStrategy(db: PrismaClient): void {
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      (email, password, done) => {
        findAndVerifyUser(email, password, db)
          .then((user) => done(null, user ?? false))
          .catch((err: unknown) => done(err));
      },
    ),
  );
}
