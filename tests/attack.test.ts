import { describe, it, expect } from 'vitest';
import { buildTarget } from '../src/engine/secret';
import { recoverMessage } from '../src/engine/attack/message';
import { bytesToString, bytesEqual, stringToBytes, BLOCK_SIZE } from '../src/engine/bytes';
import { makeRng } from '../src/engine/rng';

describe('the attack recovers the exact plaintext (PRD §7.2)', () => {
  const cases = [
    'the cipher was never the weakness here',
    'a', // 1 byte -> pad 15
    'YELLOW SUBMARINE', // 16 bytes -> full padding block
    'sixteen bytes.!!', // 16 bytes exactly
    'this is exactly thirty-two bytes', // 32 bytes -> full pad block appended
  ];

  for (const cipher of ['aes', 'toy'] as const) {
    for (const msg of cases) {
      it(`${cipher}: "${msg.slice(0, 20)}" (${msg.length}b)`, () => {
        const target = buildTarget({ seed: 'seed-' + msg.length, cipher, mac: false, message: msg });
        const result = recoverMessage(target);
        expect(result.starved).toBe(false);
        expect(bytesToString(result.plaintext)).toBe(msg);
      });
    }
  }

  it('recovers across a corpus of random plaintexts of varying lengths', () => {
    const rng = makeRng(999);
    for (let t = 0; t < 20; t++) {
      const len = rng.int(48) + 1;
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(32 + rng.int(95));
      const target = buildTarget({ seed: `corpus-${t}`, cipher: 'aes', mac: false, message: s });
      const result = recoverMessage(target);
      expect(bytesEqual(result.plaintext, stringToBytes(s))).toBe(true);
    }
  });

  it('oracle-call counts land near 128 per byte (PRD §7.2)', () => {
    const msg = 'the cipher was never the weakness here';
    const target = buildTarget({ seed: 'calls', cipher: 'aes', mac: false, message: msg });
    const result = recoverMessage(target);
    const paddedLen = Math.ceil((msg.length + 1) / BLOCK_SIZE) * BLOCK_SIZE;
    const perByte = result.totalCalls / paddedLen;
    // Average ~128, plus a couple of disambiguation probes per block.
    expect(perByte).toBeGreaterThan(80);
    expect(perByte).toBeLessThan(180);
  });
});
