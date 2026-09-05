import { describe, it, expect } from 'vitest';
import { buildTarget } from '../src/engine/secret';
import { recoverMessage } from '../src/engine/attack/message';
import { recoverBlock } from '../src/engine/attack/block';
import { splitBlocks, bytesToString } from '../src/engine/bytes';

// A message whose final plaintext byte is 0x02, and whose second-to-last is
// NOT 0x02, so that PKCS7 padding after CBC makes a 0x02-collision reachable.
// We construct plaintext ending in a real 0x02 by choosing length so the last
// content byte is 0x02, then rely on the pad. The clearest trigger: a plaintext
// that already ends in 0x02 as content.
const TRICKY = 'padding ends in two\x02'; // final content byte is 0x02

describe('false-positive disambiguation (PRD §3, §7.2)', () => {
  it('the disambiguation runs and the attack still recovers exactly', () => {
    const target = buildTarget({ seed: 'disambig', cipher: 'aes', mac: false, message: TRICKY });
    const result = recoverMessage(target);
    expect(bytesToString(result.plaintext)).toBe(TRICKY);
    // At least one block ran a disambiguation with a caught false positive OR
    // resolved genuinely — the mechanism must be present.
    const total = result.blocks.reduce((n, b) => n + b.disambiguations.length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('a genuine 0x02-terminated final block forces a caught false positive somewhere', () => {
    // Search seeds until the last block's last-byte sweep hits a longer pad
    // first (stillValid === false), proving the disambiguation is load-bearing.
    let caught = false;
    for (let s = 0; s < 40 && !caught; s++) {
      const msg = 'block boundary two\x02'.padEnd(16 + (s % 3), '\x02');
      const target = buildTarget({ seed: `fp-${s}`, cipher: 'aes', mac: false, message: msg });
      const result = recoverMessage(target);
      expect(bytesToString(result.plaintext)).toBe(msg);
      for (const blk of result.blocks) {
        if (blk.disambiguations.some((d) => d.stillValid === false)) caught = true;
      }
    }
    expect(caught).toBe(true);
  });
});

// The naive path (no disambiguation) must break on a 0x02-terminated plaintext,
// proving the fix is necessary (PRD §7.2, acceptance §8.2).
function recoverBlockNaive(
  targetBlock: Uint8Array,
  realPrevious: Uint8Array,
  oracle: (ct: Uint8Array) => boolean,
): Uint8Array {
  const BLOCK = 16;
  const intermediate = new Uint8Array(BLOCK);
  const submit = (craft: Uint8Array) => {
    const ct = new Uint8Array(BLOCK * 2);
    ct.set(craft, 0);
    ct.set(targetBlock, BLOCK);
    return oracle(ct);
  };
  for (let index = BLOCK - 1; index >= 0; index--) {
    const padTarget = BLOCK - index;
    const craft = realPrevious.slice();
    for (let j = index + 1; j < BLOCK; j++) craft[j] = intermediate[j] ^ padTarget;
    for (let c = 0; c < 256; c++) {
      craft[index] = c;
      if (submit(craft)) {
        // NAIVE: accept the first hit with no perturbation check.
        intermediate[index] = c ^ padTarget;
        break;
      }
    }
  }
  const plain = new Uint8Array(BLOCK);
  for (let i = 0; i < BLOCK; i++) plain[i] = intermediate[i] ^ realPrevious[i];
  return plain;
}

describe('the naive path is proven wrong on a 0x02 collision (PRD §7.2)', () => {
  it('naive recovery of a 0x02-ending block differs from the correct one', () => {
    // Find a seed where the final block genuinely ends in 0x02 and the naive
    // path mis-recovers the last byte.
    let proven = false;
    for (let s = 0; s < 60 && !proven; s++) {
      const msg = 'x'.repeat(13) + '\x02'; // 14 bytes, pad(1) -> ...02 then 02? build a 16-byte block
      const target = buildTarget({ seed: `naive-${s}`, cipher: 'aes', mac: false, message: msg });
      const blocks = splitBlocks(target.ciphertext);
      const lastIdx = blocks.length - 1;
      const prev = lastIdx === 0 ? target.iv : blocks[lastIdx - 1];
      const correct = recoverBlock({
        blockIndex: lastIdx,
        targetBlock: blocks[lastIdx],
        realPrevious: prev,
        oracle: target.oracle,
      });
      const correctPlain = new Uint8Array(16);
      for (const b of correct.bytes) correctPlain[b.index] = b.plaintext;
      const naivePlain = recoverBlockNaive(blocks[lastIdx], prev, target.oracle);
      const caughtFP = correct.disambiguations.some((d) => d.stillValid === false);
      if (caughtFP && naivePlain[15] !== correctPlain[15]) proven = true;
    }
    expect(proven).toBe(true);
  });
});
