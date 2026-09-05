import { describe, it, expect } from 'vitest';
import { buildTarget } from '../src/engine/secret';
import { recoverMessage } from '../src/engine/attack/message';
import { recoverBlock } from '../src/engine/attack/block';
import { splitBlocks } from '../src/engine/bytes';
import { hmacSha256 } from '../src/engine/mac';
import { fromHex, toHex, stringToBytes } from '../src/engine/bytes';

describe('HMAC-SHA256 known-answer (RFC 4231 test case 2)', () => {
  it('matches the RFC vector', () => {
    const key = stringToBytes('Jefe');
    const data = stringToBytes('what do ya want for nothing?');
    expect(toHex(hmacSha256(key, data))).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
  it('empty key/message vector', () => {
    // HMAC-SHA256 of empty message with empty key
    expect(toHex(hmacSha256(new Uint8Array(0), new Uint8Array(0)))).toBe(
      'b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad',
    );
  });
  void fromHex;
});

describe('the MAC closes the oracle (PRD §7.4, §5.6)', () => {
  it('a full last-byte sweep returns a constant verdict and recovers nothing', () => {
    const target = buildTarget({ seed: 'sealed', cipher: 'aes', mac: true, message: 'starve me' });
    const blocks = splitBlocks(target.ciphertext);
    const rec = recoverBlock({
      blockIndex: 0,
      targetBlock: blocks[0],
      realPrevious: target.iv,
      oracle: target.oracle,
    });
    // No byte recovered.
    expect(rec.bytes.length).toBe(0);
    // The sweep produced only invalid verdicts — a full 256 with no green.
    expect(rec.sweeps.length).toBe(256);
    expect(rec.sweeps.every((s) => s.valid === false)).toBe(true);
  });

  it('whole-message recovery starves under the MAC', () => {
    const target = buildTarget({ seed: 'sealed2', cipher: 'aes', mac: true, message: 'starve me' });
    const result = recoverMessage(target);
    expect(result.starved).toBe(true);
    expect(result.blocks[0].bytes.length).toBe(0);
  });

  it('the identical message recovers with the MAC off', () => {
    const target = buildTarget({ seed: 'sealed2', cipher: 'aes', mac: false, message: 'starve me' });
    const result = recoverMessage(target);
    expect(result.starved).toBe(false);
  });
});
