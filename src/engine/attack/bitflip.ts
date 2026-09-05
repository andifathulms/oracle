// Bit-flipping mode (PRD §4.3): the same CBC malleability seen as tampering.
// Flipping a byte in the previous ciphertext block flips the corresponding
// plaintext byte of the next block:  Pi = Dk(Ci) XOR Ci-1.
//
// Given the known plaintext of block i and a desired plaintext, compute the
// delta to apply to block i-1 (or the IV for block 0). Pure, and it needs the
// recovered plaintext, not the key.
import { BLOCK_SIZE } from '../bytes';

export interface BitFlipPlan {
  blockIndex: number; // the plaintext block being tampered
  previousIndex: number; // -1 means the IV
  original: Uint8Array; // original previous-block (or IV) bytes
  tampered: Uint8Array; // previous-block bytes to submit
  deltas: { index: number; from: number; to: number; xor: number }[];
}

export function planBitFlip(
  currentPlain: Uint8Array, // known plaintext of block i (16 bytes)
  desiredPlain: Uint8Array, // what the attacker wants block i to say
  previousBlock: Uint8Array, // C_{i-1} or IV (16 bytes)
  blockIndex: number,
): BitFlipPlan {
  if (currentPlain.length !== BLOCK_SIZE || desiredPlain.length !== BLOCK_SIZE) {
    throw new Error('bitflip works on one 16-byte block');
  }
  const tampered = previousBlock.slice();
  const deltas: BitFlipPlan['deltas'] = [];
  for (let i = 0; i < BLOCK_SIZE; i++) {
    const xor = currentPlain[i] ^ desiredPlain[i];
    if (xor !== 0) {
      const to = previousBlock[i] ^ xor;
      deltas.push({ index: i, from: previousBlock[i], to, xor });
      tampered[i] = to;
    }
  }
  return {
    blockIndex,
    previousIndex: blockIndex - 1,
    original: previousBlock.slice(),
    tampered,
    deltas,
  };
}
