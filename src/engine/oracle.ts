// THE oracle: the ONLY channel between attacker and secret (CLAUDE.md §1).
// Returns one bit and nothing else — no error detail, no timing, no position.
export type Oracle = (ciphertext: Uint8Array) => boolean;

export type CipherKind = 'aes' | 'toy';
