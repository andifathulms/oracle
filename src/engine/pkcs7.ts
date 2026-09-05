// PKCS7 padding over 16-byte blocks. Pure. Imports only bytes.
import { BLOCK_SIZE } from './bytes';

export function pad(data: Uint8Array, blockSize = BLOCK_SIZE): Uint8Array {
  const padLen = blockSize - (data.length % blockSize);
  // padLen is in 1..blockSize; a full block of padding is added when already aligned.
  const out = new Uint8Array(data.length + padLen);
  out.set(data, 0);
  out.fill(padLen, data.length);
  return out;
}

// Validate PKCS7. Accepts only correct padding; rejects 0x00, over-long,
// and inconsistent pads (PRD §7.3).
export function isValidPadding(data: Uint8Array, blockSize = BLOCK_SIZE): boolean {
  if (data.length === 0 || data.length % blockSize !== 0) return false;
  const padLen = data[data.length - 1];
  if (padLen < 1 || padLen > blockSize) return false;
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) return false;
  }
  return true;
}

export function strip(data: Uint8Array, blockSize = BLOCK_SIZE): Uint8Array {
  if (!isValidPadding(data, blockSize)) throw new Error('invalid padding');
  const padLen = data[data.length - 1];
  return data.slice(0, data.length - padLen);
}
