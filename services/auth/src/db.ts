import { PrismaClient } from '@prisma/client';

// Only place in the service that constructs PrismaClient.
// All route modules import { db } from '../db.js'.
export const db = new PrismaClient();
