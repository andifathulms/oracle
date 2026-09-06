export const hex = (b: number): string => b.toString(16).padStart(2, '0');

export const printable = (b: number): string =>
  b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '·';

export const isPrintable = (b: number): boolean => b >= 0x20 && b <= 0x7e;

// The void glyph, and what it means aloud.
//
// "··" reads correctly as an absent value on screen, matching the void cells in
// the stack. A screen reader announces it as "dot dot" or skips it, so anywhere
// it stands for a value it is paired with this word in visually-hidden text.
export const VOID_GLYPH = '··';
export const VOID_SPOKEN = 'none yet';
