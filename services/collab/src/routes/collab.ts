import * as Y from 'yjs';
import { randomUUID } from 'node:crypto';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket, RawData } from 'ws';
import type { EventBus } from '@platform/events';
import { AccessTokenPayloadSchema } from '@platform/types';
import type { CollabConfig } from '../config.js';
import type { DocStore } from '../yjs/DocStore.js';
import { CollabRoom } from '../ws/CollabRoom.js';
import {
  MSG_SYNC, MSG_AWARENESS,
  MSG_SYNC_STEP_1, MSG_SYNC_STEP_2, MSG_SYNC_UPDATE,
  encodeSyncStep1, encodeSyncStep2, encodeSyncUpdate,
  parseMessage, toUint8Array,
} from '../yjs/protocol.js';

const ParamsSchema = z.object({ workspaceId: z.string().uuid() });
const QuerySchema  = z.object({ token: z.string().optional() });

function extractToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  const q = QuerySchema.safeParse(request.query);
  return (q.success ? (q.data.token ?? null) : null);
}

export async function registerCollabRoutes(
  fastify: FastifyInstance,
  config: CollabConfig,
  docStore: DocStore,
  bus: EventBus,
): Promise<void> {
  // Rooms are scoped per server instance so tests start clean each run.
  const rooms = new Map<string, CollabRoom>();

  function getRoom(workspaceId: string): CollabRoom {
    let room = rooms.get(workspaceId);
    if (room === undefined) {
      room = new CollabRoom();
      rooms.set(workspaceId, room);
    }
    return room;
  }

  const secret = new TextEncoder().encode(config.jwtAccessSecret);

  fastify.get(
    '/collab/:workspaceId',
    { websocket: true },
    (socket: WebSocket, request: FastifyRequest) => {
      // JWT + params validation runs synchronously before awaiting;
      // we close the socket and return if anything is invalid.
      const token = extractToken(request);
      if (token === null) {
        socket.close(4001, 'Unauthorized');
        return;
      }

      const params = ParamsSchema.safeParse(request.params);
      if (!params.success) {
        socket.close(4000, 'Bad Request');
        return;
      }
      const { workspaceId } = params.data;

      // Verify JWT and set up the session asynchronously.
      void (async () => {
        let userId: string;
        try {
          const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
          userId = AccessTokenPayloadSchema.parse(payload).sub;
        } catch {
          socket.close(4001, 'Unauthorized');
          return;
        }

        const doc = await docStore.getOrCreate(workspaceId);
        const clientId = randomUUID();
        const room = getRoom(workspaceId);
        room.add({ id: clientId, userId, ws: socket });
        bus.emit('collab.user-joined', { workspaceId, userId, clientId });

        // Initiate sync: send the server's current state vector.
        socket.send(encodeSyncStep1(Y.encodeStateVector(doc)));

        socket.on('message', (rawData: RawData) => {
          void (async () => {
            const buf = toUint8Array(rawData as Buffer | ArrayBuffer | Buffer[]);
            const msg = parseMessage(buf);
            if (msg === null) return;

            if (msg.type === MSG_SYNC) {
              if (msg.subtype === MSG_SYNC_STEP_1) {
                // Client sent its state vector — reply with our diff.
                const update = Y.encodeStateAsUpdate(doc, msg.payload);
                socket.send(encodeSyncStep2(update));
              } else if (
                msg.subtype === MSG_SYNC_STEP_2 ||
                msg.subtype === MSG_SYNC_UPDATE
              ) {
                // Apply the client's update to the shared doc.
                Y.applyUpdate(doc, msg.payload);
                await docStore.save(workspaceId);
                bus.emit('collab.document-saved', { workspaceId });
                // Broadcast as a plain update to all other clients.
                room.broadcast(encodeSyncUpdate(msg.payload), clientId);
              }
            } else if (msg.type === MSG_AWARENESS) {
              // Relay awareness (cursors, presence) without interpretation.
              room.broadcast(buf, clientId);
            }
          })().catch((_err: unknown) => {
            // Errors in the message handler are logged at the socket error level.
            socket.emit('error', _err instanceof Error ? _err : new Error(String(_err)));
          });
        });

        socket.on('close', () => {
          room.remove(clientId);
          bus.emit('collab.user-left', { workspaceId, userId, clientId });
          if (room.isEmpty()) rooms.delete(workspaceId);
        });

        socket.on('error', () => {
          room.remove(clientId);
          if (room.isEmpty()) rooms.delete(workspaceId);
        });
      })().catch((_err: unknown) => {
        try { socket.close(4011, 'Internal server error'); } catch { /* already closed */ }
      });
    },
  );
}
