// HMAC-SHA256 for encrypt-then-MAC (CLAUDE.md §1, PRD §5.6). Pure.
import { concatBytes, bytesEqual } from './bytes';
import { sha256 } from './sha256';

const BLOCK = 64;

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > BLOCK) k = sha256(k);
  const kPad = new Uint8Array(BLOCK);
  kPad.set(k, 0);
  const ipad = new Uint8Array(BLOCK);
  const opad = new Uint8Array(BLOCK);
  for (let i = 0; i < BLOCK; i++) {
    ipad[i] = kPad[i] ^ 0x36;
    opad[i] = kPad[i] ^ 0x5c;
  }
  const inner = sha256(concatBytes(ipad, message));
  return sha256(concatBytes(opad, inner));
}

// Constant-time-ish comparison (the app has no real adversary, but honest).
export function macEqual(a: Uint8Array, b: Uint8Array): boolean {
  return bytesEqual(a, b);
}
