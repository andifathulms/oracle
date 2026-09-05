// The secret boundary (CLAUDE.md §3, PRD §6.1). This module constructs the
// key, plaintext, IV and ciphertext, and hands upward ONLY an AttackTarget:
// the ciphertext, the IV, and an Oracle closure over the key. It never exports
// the key or the plaintext. They live in the closure.
//
// With the MAC on, the oracle checks the MAC first and returns false before
// decrypting (PRD §5.6) — so the sweep starves.
import { BLOCK_SIZE, concatBytes, stringToBytes } from './bytes';
import { makeRng, hashSeed } from './rng';
import { createAes128, createToyCipher } from './aes';
import { cbcEncrypt, cbcDecrypt } from './cbc';
import { pad, isValidPadding } from './pkcs7';
import { hmacSha256, macEqual } from './mac';
import type { Oracle, CipherKind } from './oracle';

export interface AttackTarget {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  oracle: Oracle;
  blockSize: 16;
  callCount: () => number;
}

export interface SecretConfig {
  seed: string;
  cipher: CipherKind;
  mac: boolean;
  message?: string; // optional override; otherwise chosen from the seed
}

// A small pool of synthetic messages, some chosen to end in genuine padding
// collisions so the disambiguation is exercised in normal play.
const MESSAGES = [
  'the cipher was never the weakness here',
  'user=guest;role=viewer;theme=dark',
  'attack at dawn, bring the padding',
  'meet me where the blocks align',
];

export function chooseMessage(seed: string): string {
  const rng = makeRng(hashSeed(seed));
  return MESSAGES[rng.int(MESSAGES.length)];
}

export function buildTarget(config: SecretConfig): AttackTarget {
  const seedNum = hashSeed(config.seed);
  const rng = makeRng(seedNum);

  // key, IV, and mac key are secret material derived from the seed.
  const key = rng.bytes(BLOCK_SIZE);
  const iv = rng.bytes(BLOCK_SIZE);
  const macKey = rng.bytes(32);

  const plaintext = stringToBytes(config.message ?? chooseMessage(config.seed));
  const cipher = config.cipher === 'aes' ? createAes128(key) : createToyCipher(key);

  const ciphertext = cbcEncrypt(cipher, iv, pad(plaintext));
  const useMac = config.mac;

  // Encrypt-then-MAC: the tag authenticates iv || ciphertext.
  const tag = useMac ? hmacSha256(macKey, concatBytes(iv, ciphertext)) : new Uint8Array(0);

  let calls = 0;
  const oracle: Oracle = (submitted: Uint8Array): boolean => {
    calls++;
    if (useMac) {
      // Check the MAC first; on failure return false before decrypting.
      const expected = hmacSha256(macKey, concatBytes(iv, submitted));
      if (!macEqual(expected, tag)) return false;
    }
    const decrypted = cbcDecrypt(cipher, iv, submitted);
    return isValidPadding(decrypted);
  };

  return {
    ciphertext,
    iv,
    oracle,
    blockSize: BLOCK_SIZE,
    callCount: () => calls,
  };
}
