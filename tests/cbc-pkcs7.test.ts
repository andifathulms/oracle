import { describe, it, expect } from 'vitest';
import { pad, isValidPadding, strip } from '../src/engine/pkcs7';
import { cbcEncrypt, cbcDecrypt } from '../src/engine/cbc';
import { createAes128, createToyCipher } from '../src/engine/aes';
import { fromHex, toHex, stringToBytes, bytesEqual } from '../src/engine/bytes';
import { makeRng } from '../src/engine/rng';

describe('PKCS7', () => {
  it('pads to a block boundary', () => {
    expect(pad(stringToBytes('YELLOW SUBMARINE')).length).toBe(32); // full block added
    expect(pad(stringToBytes('abc')).length).toBe(16);
    expect(Array.from(pad(stringToBytes('abc')).slice(3))).toEqual(new Array(13).fill(13));
  });

  it('adds a full padding block when already aligned (PRD §7.3)', () => {
    const data = stringToBytes('YELLOW SUBMARINE'); // 16 bytes
    const padded = pad(data);
    expect(padded.length).toBe(32);
    expect(Array.from(padded.slice(16))).toEqual(new Array(16).fill(16));
    expect(bytesEqual(strip(padded), data)).toBe(true);
  });

  it('accepts only correct padding, rejects malformations', () => {
    expect(isValidPadding(new Uint8Array([...new Array(15).fill(0), 1]))).toBe(true);
    expect(isValidPadding(new Uint8Array([...new Array(14).fill(0), 2, 2]))).toBe(true);
    // 0x00 is invalid
    expect(isValidPadding(new Uint8Array(16).fill(0))).toBe(false);
    // over-long
    const over = new Uint8Array(16).fill(17); over[15] = 17;
    expect(isValidPadding(over)).toBe(false);
    // inconsistent pad
    const bad = new Uint8Array(16); bad[15] = 3; bad[14] = 3; bad[13] = 2;
    expect(isValidPadding(bad)).toBe(false);
    // not a block multiple
    expect(isValidPadding(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe('CBC round-trip', () => {
  for (const [name, make] of [
    ['AES-128', createAes128],
    ['toy', createToyCipher],
  ] as const) {
    it(`${name}: encrypt then decrypt recovers padded plaintext for all boundary cases`, () => {
      const rng = makeRng(12345);
      const key = rng.bytes(16);
      const cipher = make(key);
      for (const len of [0, 1, 15, 16, 17, 31, 32, 33, 48]) {
        const iv = rng.bytes(16);
        const msg = rng.bytes(len);
        const ct = cbcEncrypt(cipher, iv, pad(msg));
        const dec = cbcDecrypt(cipher, iv, ct);
        expect(isValidPadding(dec)).toBe(true);
        expect(bytesEqual(strip(dec), msg)).toBe(true);
      }
    });
  }
});

describe('AES-128 known-answer (FIPS-197 / appendix B & C.1)', () => {
  it('matches the FIPS-197 example block', () => {
    // FIPS-197 Appendix B: key 2b7e..., input 3243f6..., output 3925841d02dc09fbdc118597196a0b32
    const key = fromHex('2b7e151628aed2a6abf7158809cf4f3c');
    const pt = fromHex('3243f6a8885a308d313198a2e0370734');
    const ct = createAes128(key).encryptBlock(pt);
    expect(toHex(ct)).toBe('3925841d02dc09fbdc118597196a0b32');
  });

  it('matches the FIPS-197 Appendix C.1 vector and round-trips', () => {
    const key = fromHex('000102030405060708090a0b0c0d0e0f');
    const pt = fromHex('00112233445566778899aabbccddeeff');
    const cipher = createAes128(key);
    const ct = cipher.encryptBlock(pt);
    expect(toHex(ct)).toBe('69c4e0d86a7b0430d8cdb78070b4c55a');
    expect(toHex(cipher.decryptBlock(ct))).toBe('00112233445566778899aabbccddeeff');
  });

  it('toy cipher is a genuine bijection over all-byte probes', () => {
    const cipher = createToyCipher(fromHex('00112233445566778899aabbccddeeff'));
    const rng = makeRng(7);
    for (let t = 0; t < 200; t++) {
      const b = rng.bytes(16);
      expect(bytesEqual(cipher.decryptBlock(cipher.encryptBlock(b)), b)).toBe(true);
    }
  });
});
