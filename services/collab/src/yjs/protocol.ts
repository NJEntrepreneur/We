// y-websocket binary protocol — compatible with the official y-websocket provider.
// Implemented without lib0 to avoid ESM resolution issues in NodeNext.

// ── Message type constants ────────────────────────────────────────────────────

export const MSG_SYNC = 0;
export const MSG_AWARENESS = 1;

export const MSG_SYNC_STEP_1 = 0;
export const MSG_SYNC_STEP_2 = 1;
export const MSG_SYNC_UPDATE = 2;

// ── Varint helpers (identical to lib0's encoding) ────────────────────────────

function writeVarUint(buf: number[], n: number): void {
  while (n > 0x7f) {
    buf.push(0x80 | (n & 0x7f));
    n >>>= 7;
  }
  buf.push(n & 0x7f);
}

function readVarUint(buf: Uint8Array, pos: { n: number }): number {
  let result = 0;
  let shift = 0;
  let byte: number;
  do {
    byte = buf[pos.n++] ?? 0;
    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte > 0x7f);
  return result >>> 0;
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildSyncMessage(subtype: number, payload: Uint8Array): Uint8Array {
  const header: number[] = [];
  writeVarUint(header, MSG_SYNC);
  writeVarUint(header, subtype);
  writeVarUint(header, payload.length);
  return new Uint8Array([...header, ...payload]);
}

export function encodeSyncStep1(stateVector: Uint8Array): Uint8Array {
  return buildSyncMessage(MSG_SYNC_STEP_1, stateVector);
}

export function encodeSyncStep2(update: Uint8Array): Uint8Array {
  return buildSyncMessage(MSG_SYNC_STEP_2, update);
}

export function encodeSyncUpdate(update: Uint8Array): Uint8Array {
  return buildSyncMessage(MSG_SYNC_UPDATE, update);
}

// ── Message parser ────────────────────────────────────────────────────────────

export interface SyncMessage {
  type: typeof MSG_SYNC;
  subtype: number;
  payload: Uint8Array;
}

export interface AwarenessMessage {
  type: typeof MSG_AWARENESS;
  payload: Uint8Array;
}

export type CollabMessage = SyncMessage | AwarenessMessage;

export function parseMessage(buf: Uint8Array): CollabMessage | null {
  if (buf.length === 0) return null;
  const pos = { n: 0 };
  const type = readVarUint(buf, pos);

  if (type === MSG_SYNC) {
    if (pos.n >= buf.length) return null;
    const subtype = readVarUint(buf, pos);
    const payloadLen = readVarUint(buf, pos);
    const payload = buf.slice(pos.n, pos.n + payloadLen);
    return { type: MSG_SYNC, subtype, payload };
  }

  if (type === MSG_AWARENESS) {
    return { type: MSG_AWARENESS, payload: buf.slice(pos.n) };
  }

  return null;
}

// ── Raw data → Uint8Array ─────────────────────────────────────────────────────

export function toUint8Array(data: Buffer | ArrayBuffer | Buffer[]): Uint8Array {
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (Array.isArray(data)) {
    const combined = Buffer.concat(data);
    return new Uint8Array(combined.buffer, combined.byteOffset, combined.byteLength);
  }
  return new Uint8Array(data);
}
