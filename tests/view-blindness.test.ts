import { describe, it, expect } from 'vitest';
import { buildTarget } from '../src/engine/secret';
import type { AttackTarget } from '../src/engine/secret';
import { recoverMessage } from '../src/engine/attack/message';
import { bytesToString } from '../src/engine/bytes';

// Type-level: AttackTarget has no key or plaintext field (PRD §7.5).
// These lines fail to compile if such a field is ever added — the // @ts-expect-error
// asserts the property genuinely does not exist.
type _NoKey = AttackTarget extends { key: unknown } ? never : true;
type _NoPlain = AttackTarget extends { plaintext: unknown } ? never : true;
const _t1: _NoKey = true;
const _t2: _NoPlain = true;

describe('the view cannot see the secret (PRD §7.5, CLAUDE.md §3)', () => {
  it('AttackTarget exposes only ciphertext, iv, oracle, blockSize, callCount', () => {
    const target = buildTarget({ seed: 'blind', cipher: 'aes', mac: false });
    expect(Object.keys(target).sort()).toEqual(
      ['blockSize', 'callCount', 'ciphertext', 'iv', 'oracle'].sort(),
    );
    // @ts-expect-error — no key field exists on AttackTarget
    expect(target.key).toBeUndefined();
    // @ts-expect-error — no plaintext field exists on AttackTarget
    expect(target.plaintext).toBeUndefined();
  });

  it('runtime: the on-screen answer comes from the attack, not a held value', () => {
    // The known plaintext lives only in this test closure; the target never
    // receives it back, and the attack still reproduces it exactly.
    const secretMessage = 'only this closure knows me';
    const target = buildTarget({ seed: 'closure', cipher: 'aes', mac: false, message: secretMessage });
    const recovered = recoverMessage(target);
    expect(bytesToString(recovered.plaintext)).toBe(secretMessage);
    void _t1; void _t2;
  });
});
