// The engine's public surface (CLAUDE.md §1). Exports the attack-facing
// surface ONLY. Nothing here can hand a view the key or the plaintext:
// AttackTarget has no such field, and MessageRecovery holds only what the
// attack produced.
export type { Oracle, CipherKind } from './oracle';
export type { AttackTarget, SecretConfig } from './secret';
export { buildTarget, chooseMessage } from './secret';
export { recoverMessage } from './attack/message';
export { recoverBlock } from './attack/block';
export { planBitFlip } from './attack/bitflip';
export type { BitFlipPlan } from './attack/bitflip';
export type {
  SweepStep,
  Disambiguation,
  ByteRecovered,
  BlockRecovery,
  MessageRecovery,
} from './attack/trace';
export { BLOCK_SIZE, toHex, fromHex, bytesToString, stringToBytes } from './bytes';
