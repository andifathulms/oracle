// CBC encrypt/decrypt driver over a BlockCipher. Pure. (CLAUDE.md §1 layout)
//
//   Pi = Dk(Ci) XOR Ci-1      (PRD §2)
//
// encrypt takes already-padded plaintext; decrypt returns padded plaintext
// (validation is the oracle's job, not the driver's).
import { BLOCK_SIZE, concatBytes, splitBlocks, xorBytes } from './bytes';
import type { BlockCipher } from './aes';

export function cbcEncrypt(
  cipher: BlockCipher,
  iv: Uint8Array,
  padded: Uint8Array,
): Uint8Array {
  if (iv.length !== BLOCK_SIZE) throw new Error('iv must be one block');
  const blocks = splitBlocks(padded);
  const out: Uint8Array[] = [];
  let prev = iv;
  for (const block of blocks) {
    const c = cipher.encryptBlock(xorBytes(block, prev));
    out.push(c);
    prev = c;
  }
  return concatBytes(...out);
}

export function cbcDecrypt(
  cipher: BlockCipher,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  const blocks = splitBlocks(ciphertext);
  const out: Uint8Array[] = [];
  let prev = iv;
  for (const block of blocks) {
    const intermediate = cipher.decryptBlock(block);
    out.push(xorBytes(intermediate, prev));
    prev = block;
  }
  return concatBytes(...out);
}
