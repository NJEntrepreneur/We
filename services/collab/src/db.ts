import { PrismaClient } from '@prisma/client';

// Typed subset of PrismaClient used by the collab service.
// Matches structural typing so tests can inject plain objects.
export interface CollabDb {
  collabDocument: {
    findUnique(args: {
      where: { workspaceId: string };
    }): Promise<{ state: Buffer } | null>;

    upsert(args: {
      where: { workspaceId: string };
      create: { id: string; workspaceId: string; state: Buffer };
      update: { state: Buffer };
    }): Promise<unknown>;
  };
}

let _client: PrismaClient | undefined;

export function getDb(): CollabDb {
  if (_client === undefined) {
    _client = new PrismaClient();
  }
  return _client;
}
