// PBKDF2 password hashing via Web Crypto — no external deps.

const ITERATIONS = 100_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i >>> 1] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: ITERATIONS },
    keyMaterial,
    KEY_BITS,
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/** Returns `${saltHex}:${keyHex}` suitable for DB storage. */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(plaintext, salt);
  return `${bufToHex(salt.buffer)}:${bufToHex(key)}`;
}

/** Constant-time verification against a stored hash. */
export async function verifyPassword(
  plaintext: string,
  stored: string,
): Promise<boolean> {
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const saltHex = stored.slice(0, colonIdx);
  const keyHex = stored.slice(colonIdx + 1);
  const salt = hexToBuf(saltHex);
  const derived = await deriveKey(plaintext, salt);
  return timingSafeEqual(new Uint8Array(derived), hexToBuf(keyHex));
}
