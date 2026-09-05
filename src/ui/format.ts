export const hex = (b: number): string => b.toString(16).padStart(2, '0');

export const printable = (b: number): string =>
  b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '·';

export const isPrintable = (b: number): boolean => b >= 0x20 && b <= 0x7e;
