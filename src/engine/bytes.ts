// Pure byte helpers. Imports nothing (CLAUDE.md §5).

export const BLOCK_SIZE = 16 as const;

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error(`xor length mismatch: ${a.length} vs ${b.length}`);
  }
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function splitBlocks(data: Uint8Array, size = BLOCK_SIZE): Uint8Array[] {
  if (data.length % size !== 0) {
    throw new Error(`data length ${data.length} is not a multiple of ${size}`);
  }
  const blocks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += size) {
    blocks.push(data.slice(i, i + size));
  }
  return blocks;
}

export function toHex(data: Uint8Array): string {
  let s = '';
  for (let i = 0; i < data.length; i++) s += data[i].toString(16).padStart(2, '0');
  return s;
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) throw new Error('hex length must be even');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`invalid hex at ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function stringToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 0xff) throw new Error('only latin-1 plaintext supported');
    out[i] = code;
  }
  return out;
}

export function bytesToString(data: Uint8Array): string {
  let s = '';
  for (let i = 0; i < data.length; i++) s += String.fromCharCode(data[i]);
  return s;
}
