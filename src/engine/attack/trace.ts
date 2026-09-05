// The trace: every sweep step, every disambiguation, recorded (CLAUDE.md §4).
// The views render the trace and never re-run the attack (CLAUDE.md §5).
import { BLOCK_SIZE } from '../bytes';

export interface SweepStep {
  targetIndex: number; // which byte of the block, 15 down to 0
  candidate: number; // 0..255 being tried
  craftedBlock: Uint8Array;
  valid: boolean; // the oracle's one bit
}

export interface Disambiguation {
  targetIndex: 15;
  firstHit: number; // the candidate that first returned valid
  perturbedProbe: Uint8Array; // crafted block with byte 14 perturbed
  stillValid: boolean; // true => genuine 0x01; false => was a longer pad
  resolvedCandidate: number; // the candidate finally accepted
}

export interface ByteRecovered {
  index: number;
  intermediate: number; // Dk(C)[index]
  plaintext: number; // intermediate XOR realPrevious[index]
  paddingTarget: number; // the pad value forced this round
  oracleCalls: number;
}

export interface BlockRecovery {
  blockIndex: number;
  sweeps: SweepStep[];
  disambiguations: Disambiguation[];
  bytes: ByteRecovered[]; // in recovery order: 15, 14, ... 0
  totalCalls: number;
}

export interface MessageRecovery {
  blocks: BlockRecovery[];
  plaintext: Uint8Array; // padding stripped
  intermediate: Uint8Array; // all recovered intermediate bytes, concatenated
  plaintextPadded: Uint8Array; // before stripping
  totalCalls: number;
  starved: boolean; // true when no byte was ever recovered (MAC on)
  blockSize: typeof BLOCK_SIZE;
}
