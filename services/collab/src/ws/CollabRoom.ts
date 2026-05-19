import type { WebSocket } from 'ws';

export interface CollabClient {
  readonly id: string;
  readonly userId: string;
  readonly ws: WebSocket;
}

const WS_OPEN = 1; // WebSocket.OPEN

export class CollabRoom {
  private readonly _clients = new Map<string, CollabClient>();

  add(client: CollabClient): void {
    this._clients.set(client.id, client);
  }

  remove(clientId: string): void {
    this._clients.delete(clientId);
  }

  broadcast(data: Uint8Array, excludeId?: string): void {
    for (const [id, client] of this._clients) {
      if (id !== excludeId && client.ws.readyState === WS_OPEN) {
        client.ws.send(data);
      }
    }
  }

  get size(): number {
    return this._clients.size;
  }

  isEmpty(): boolean {
    return this._clients.size === 0;
  }
}
