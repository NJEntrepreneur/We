// Uses the Web Crypto API (globalThis.crypto) — available in Node 20+ and all modern browsers.
// §17: no eval, no new Function — all crypto is via the platform API.

function toUint8Array(data: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Hex string must have even length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    bytes[i >>> 1] = byte;
  }
  return bytes;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Returns the hex-encoded SHA-256 or SHA-384 digest of the input. */
export async function hash(
  algorithm: 'SHA-256' | 'SHA-384',
  data: string | Uint8Array | ArrayBuffer,
): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(algorithm, toUint8Array(data));
  return bufferToHex(digest);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Returns a hex-encoded HMAC-SHA-256 signature. */
export async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bufferToHex(sig);
}

/** Constant-time HMAC-SHA-256 verification via the subtle API. */
export async function hmacVerify(
  secret: string,
  data: string,
  signature: string,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  const sigBytes = hexToUint8Array(signature);
  return globalThis.crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
}

/**
 * Computes a sha384 SRI integrity hash suitable for the plugin manifest
 * `integrity` field.  Accepts raw file content as string, Uint8Array, or ArrayBuffer.
 */
export async function sriHash(content: string | Uint8Array | ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-384', toUint8Array(content));
  return `sha384-${bufferToBase64(digest)}`;
}

/** Cryptographically secure UUID v4. */
export function randomId(): string {
  return globalThis.crypto.randomUUID();
}

/** Returns `length` cryptographically random bytes as a lowercase hex string. */
export function randomBytes(length: number): string {
  if (length < 1) throw new RangeError('length must be at least 1');
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}
