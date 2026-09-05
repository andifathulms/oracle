// Seeded PRNG so a session is reproducible and shareable (CLAUDE.md §6).
// Imports nothing.

// mulberry32: small, fast, good enough for synthetic key/IV/plaintext material.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next(): number;
  byte(): number;
  bytes(n: number): Uint8Array;
  int(maxExclusive: number): number;
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  const rng: Rng = {
    next,
    byte: () => Math.floor(next() * 256) & 0xff,
    bytes: (n: number) => {
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) out[i] = Math.floor(next() * 256) & 0xff;
      return out;
    },
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
  };
  return rng;
}

// Derive a stable 32-bit seed from a string (for URL seeds).
export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
