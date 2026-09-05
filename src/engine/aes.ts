// Block cipher over a 16-byte block (CLAUDE.md §2).
//
// Two backends behind one BlockCipher interface:
//  - a real AES-128 written here (no crypto library, no WASM fetch) whose
//    correctness is pinned by the FIPS-197 known-answer vector in a test;
//  - a toy permutation: a fixed, seeded, reversible byte shuffle + substitute,
//    a genuine bijection.
//
// The attack imports neither. It only ever calls the oracle. Switching the
// backend changes nothing about the attack (PRD §6.3).
import { BLOCK_SIZE } from './bytes';
import { makeRng } from './rng';

export interface BlockCipher {
  readonly name: string;
  encryptBlock(block: Uint8Array): Uint8Array;
  decryptBlock(block: Uint8Array): Uint8Array;
}

// ---- Real AES-128 ----

const SBOX = new Uint8Array(256);
const INV_SBOX = new Uint8Array(256);
(function buildSbox() {
  // Multiplicative inverse in GF(2^8) then the affine transform.
  const p = new Uint8Array(256);
  const inv = new Uint8Array(256);
  // Build log/antilog tables using generator 3.
  const log = new Uint8Array(256);
  const exp = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    // multiply x by 3 in GF(2^8)
    let m = x << 1;
    if (m & 0x100) m ^= 0x11b;
    m ^= x;
    x = m & 0xff;
  }
  inv[0] = 0;
  for (let i = 1; i < 256; i++) inv[i] = exp[(255 - log[i]) % 255];
  for (let i = 0; i < 256; i++) {
    let s = inv[i];
    let xf = s;
    for (let t = 0; t < 4; t++) {
      s = ((s << 1) | (s >>> 7)) & 0xff;
      xf ^= s;
    }
    xf ^= 0x63;
    p[i] = xf;
  }
  SBOX.set(p);
  for (let i = 0; i < 256; i++) INV_SBOX[p[i]] = i;
})();

const RCON = new Uint8Array([0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]);

function xtime(a: number): number {
  const r = a << 1;
  return (r & 0x100 ? r ^ 0x11b : r) & 0xff;
}

function mul(a: number, b: number): number {
  let res = 0;
  let aa = a;
  let bb = b;
  while (bb) {
    if (bb & 1) res ^= aa;
    aa = xtime(aa);
    bb >>= 1;
  }
  return res & 0xff;
}

function expandKey(key: Uint8Array): Uint8Array[] {
  if (key.length !== 16) throw new Error('AES-128 requires a 16-byte key');
  const words: number[][] = [];
  for (let i = 0; i < 4; i++) {
    words.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
  }
  for (let i = 4; i < 44; i++) {
    let temp = words[i - 1].slice();
    if (i % 4 === 0) {
      temp = [temp[1], temp[2], temp[3], temp[0]]; // RotWord
      temp = temp.map((b) => SBOX[b]); // SubWord
      temp[0] ^= RCON[i / 4 - 1];
    }
    words.push(words[i - 4].map((b, j) => b ^ temp[j]));
  }
  // Round keys as 16-byte blocks.
  const roundKeys: Uint8Array[] = [];
  for (let r = 0; r < 11; r++) {
    const rk = new Uint8Array(16);
    for (let c = 0; c < 4; c++) rk.set(words[r * 4 + c], c * 4);
    roundKeys.push(rk);
  }
  return roundKeys;
}

function addRoundKey(state: Uint8Array, rk: Uint8Array): void {
  for (let i = 0; i < 16; i++) state[i] ^= rk[i];
}

function subBytes(state: Uint8Array, box: Uint8Array): void {
  for (let i = 0; i < 16; i++) state[i] = box[state[i]];
}

// State is column-major (AES standard): byte index = row + 4*col.
function shiftRows(state: Uint8Array): void {
  const s = state.slice();
  for (let row = 1; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      state[row + 4 * col] = s[row + 4 * ((col + row) % 4)];
    }
  }
}

function invShiftRows(state: Uint8Array): void {
  const s = state.slice();
  for (let row = 1; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      state[row + 4 * col] = s[row + 4 * ((col - row + 4) % 4)];
    }
  }
}

function mixColumns(state: Uint8Array): void {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
    state[i] = mul(a0, 2) ^ mul(a1, 3) ^ a2 ^ a3;
    state[i + 1] = a0 ^ mul(a1, 2) ^ mul(a2, 3) ^ a3;
    state[i + 2] = a0 ^ a1 ^ mul(a2, 2) ^ mul(a3, 3);
    state[i + 3] = mul(a0, 3) ^ a1 ^ a2 ^ mul(a3, 2);
  }
}

function invMixColumns(state: Uint8Array): void {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
    state[i] = mul(a0, 14) ^ mul(a1, 11) ^ mul(a2, 13) ^ mul(a3, 9);
    state[i + 1] = mul(a0, 9) ^ mul(a1, 14) ^ mul(a2, 11) ^ mul(a3, 13);
    state[i + 2] = mul(a0, 13) ^ mul(a1, 9) ^ mul(a2, 14) ^ mul(a3, 11);
    state[i + 3] = mul(a0, 11) ^ mul(a1, 13) ^ mul(a2, 9) ^ mul(a3, 14);
  }
}

export function createAes128(key: Uint8Array): BlockCipher {
  const roundKeys = expandKey(key);
  return {
    name: 'AES-128',
    encryptBlock(block: Uint8Array): Uint8Array {
      if (block.length !== 16) throw new Error('block must be 16 bytes');
      const state = block.slice();
      addRoundKey(state, roundKeys[0]);
      for (let round = 1; round < 10; round++) {
        subBytes(state, SBOX);
        shiftRows(state);
        mixColumns(state);
        addRoundKey(state, roundKeys[round]);
      }
      subBytes(state, SBOX);
      shiftRows(state);
      addRoundKey(state, roundKeys[10]);
      return state;
    },
    decryptBlock(block: Uint8Array): Uint8Array {
      if (block.length !== 16) throw new Error('block must be 16 bytes');
      const state = block.slice();
      addRoundKey(state, roundKeys[10]);
      for (let round = 9; round >= 1; round--) {
        invShiftRows(state);
        subBytes(state, INV_SBOX);
        addRoundKey(state, roundKeys[round]);
        invMixColumns(state);
      }
      invShiftRows(state);
      subBytes(state, INV_SBOX);
      addRoundKey(state, roundKeys[0]);
      return state;
    },
  };
}

// ---- Toy permutation ----
//
// A genuine bijection over a 16-byte block: a fixed byte-position shuffle
// composed with a per-position keyed byte substitution (each position gets a
// bijective S-box built as a keyed rotation+xor). Reversible by construction.
export function createToyCipher(key: Uint8Array): BlockCipher {
  const rng = makeRng(0x70a1 ^ (key[0] | (key[1] << 8) | (key[2] << 16) | (key[3] << 24)));

  // A permutation of positions 0..15.
  const perm = Array.from({ length: BLOCK_SIZE }, (_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const invPerm = new Array<number>(BLOCK_SIZE);
  perm.forEach((p, i) => (invPerm[p] = i));

  // Per-position affine byte bijection: y = ((x <<< r) ^ k). Invertible.
  const rot = Array.from({ length: BLOCK_SIZE }, () => 1 + rng.int(7));
  const add = Array.from({ length: BLOCK_SIZE }, () => rng.byte());
  const rotl = (b: number, r: number) => ((b << r) | (b >>> (8 - r))) & 0xff;
  const rotr = (b: number, r: number) => ((b >>> r) | (b << (8 - r))) & 0xff;

  return {
    name: 'Toy permutation',
    encryptBlock(block: Uint8Array): Uint8Array {
      if (block.length !== 16) throw new Error('block must be 16 bytes');
      const out = new Uint8Array(BLOCK_SIZE);
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const sub = rotl(block[i], rot[i]) ^ add[i];
        out[perm[i]] = sub & 0xff;
      }
      return out;
    },
    decryptBlock(block: Uint8Array): Uint8Array {
      if (block.length !== 16) throw new Error('block must be 16 bytes');
      const out = new Uint8Array(BLOCK_SIZE);
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const src = block[perm[i]];
        out[i] = rotr((src ^ add[i]) & 0xff, rot[i]);
      }
      return out;
    },
  };
}
