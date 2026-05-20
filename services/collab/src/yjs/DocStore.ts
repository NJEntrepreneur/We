import * as Y from 'yjs';
import { randomUUID } from 'node:crypto';
import type { CollabDb } from '../db.js';

export class DocStore {
  private readonly _docs = new Map<string, Y.Doc>();

  constructor(private readonly _db: CollabDb) {}

  async getOrCreate(workspaceId: string): Promise<Y.Doc> {
    const existing = this._docs.get(workspaceId);
    if (existing !== undefined) return existing;

    const doc = new Y.Doc();
    const record = await this._db.collabDocument.findUnique({ where: { workspaceId } });
    if (record !== null) {
      Y.applyUpdate(doc, new Uint8Array(record.state));
    }

    this._docs.set(workspaceId, doc);
    return doc;
  }

  async save(workspaceId: string): Promise<void> {
    const doc = this._docs.get(workspaceId);
    if (doc === undefined) return;

    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    await this._db.collabDocument.upsert({
      where: { workspaceId },
      create: { id: randomUUID(), workspaceId, state },
      update: { state },
    });
  }
}
