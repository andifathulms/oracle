// Recover one ciphertext block from the oracle alone, with the correct
// false-positive disambiguation (CLAUDE.md §4, PRD §2/§3).
//
// To attack block C_i the attacker submits a two-block ciphertext
// [craft | C_i]. PKCS7 validity only inspects the final block, whose seen
// plaintext is P_seen = Dk(C_i) XOR craft. So sweeping bytes of `craft`
// forces padding values in the last block while Dk(C_i) stays unknown.
import { BLOCK_SIZE, concatBytes } from '../bytes';
import type { Oracle } from '../oracle';
import type { BlockRecovery, SweepStep, Disambiguation, ByteRecovered } from './trace';

export interface BlockInput {
  blockIndex: number;
  targetBlock: Uint8Array; // C_i, the block whose plaintext we recover
  realPrevious: Uint8Array; // C_{i-1} (or IV) — used to compute real plaintext
  oracle: Oracle;
  // Defaults to true: the correct attack. Set false to run the naive path that
  // accepts the first hit without the perturbation check (PRD §3). It exists so
  // the interface can let a reader switch the check off and watch a block
  // corrupt, rather than being told the check matters. It is never the default
  // and PRD §7.2's assertion still pins the correct path.
  disambiguate?: boolean;
}

function submit(oracle: Oracle, craft: Uint8Array, target: Uint8Array): boolean {
  return oracle(concatBytes(craft, target));
}

// Perturb a byte to a different value deterministically.
function perturb(v: number): number {
  return v ^ 0xff;
}

export function recoverBlock(input: BlockInput): BlockRecovery {
  const { blockIndex, targetBlock, realPrevious, oracle } = input;
  const disambiguate = input.disambiguate !== false;
  const sweeps: SweepStep[] = [];
  const disambiguations: Disambiguation[] = [];
  const bytes: ByteRecovered[] = [];

  const intermediate = new Uint8Array(BLOCK_SIZE); // Dk(C_i), filled 15..0
  const known = new Array<boolean>(BLOCK_SIZE).fill(false);

  const startCalls = { n: 0 };
  let localCalls = 0;
  const ask = (craft: Uint8Array): boolean => {
    localCalls++;
    return submit(oracle, craft, targetBlock);
  };

  // Base crafted block: the target's predecessor (CLAUDE.md §4 message.ts).
  const base = realPrevious.slice();

  for (let index = BLOCK_SIZE - 1; index >= 0; index--) {
    const paddingTarget = BLOCK_SIZE - index; // 1 for last byte, 2 for next, ...
    const callsBefore = localCalls;

    // Fix the already-known tail so its P_seen equals paddingTarget.
    const craft = base.slice();
    for (let j = index + 1; j < BLOCK_SIZE; j++) {
      craft[j] = intermediate[j] ^ paddingTarget;
    }

    let accepted = -1;

    if (index === BLOCK_SIZE - 1) {
      // Last byte: sweep, then disambiguate on the first hit (PRD §3).
      let candidate = 0;
      while (candidate < 256) {
        craft[index] = candidate;
        const valid = ask(craft);
        sweeps.push({ targetIndex: index, candidate, craftedBlock: craft.slice(), valid });
        if (valid) {
          if (!disambiguate) {
            // The naive path: accept the first hit. On a block whose plaintext
            // makes a longer pad reachable first, this records the wrong
            // intermediate byte and silently corrupts everything after it.
            accepted = candidate;
            break;
          }
          // Disambiguation: perturb byte 14 and re-query.
          const probe = craft.slice();
          probe[14] = perturb(probe[14]);
          const stillValid = ask(probe);
          disambiguations.push({
            targetIndex: 15,
            firstHit: candidate,
            perturbedProbe: probe.slice(),
            stillValid,
            resolvedCandidate: stillValid ? candidate : -1,
          });
          if (stillValid) {
            accepted = candidate;
            break;
          }
          // False positive: a longer pad. Resume from the next candidate,
          // and patch the resolvedCandidate once we settle.
          candidate++;
          continue;
        }
        candidate++;
      }
      // Patch the last disambiguation's resolved candidate if it was a retry chain.
      if (accepted >= 0) {
        const last = disambiguations[disambiguations.length - 1];
        if (last && last.resolvedCandidate < 0) last.resolvedCandidate = accepted;
      }
    } else {
      // Interior byte: single sweep, no ambiguity (the tail is pinned).
      for (let candidate = 0; candidate < 256; candidate++) {
        craft[index] = candidate;
        const valid = ask(craft);
        sweeps.push({ targetIndex: index, candidate, craftedBlock: craft.slice(), valid });
        if (valid) {
          accepted = candidate;
          break;
        }
      }
    }

    if (accepted < 0) {
      // Starved (e.g. MAC on): no candidate ever validated. Stop.
      break;
    }

    intermediate[index] = accepted ^ paddingTarget;
    known[index] = true;
    const plaintext = intermediate[index] ^ realPrevious[index];
    bytes.push({
      index,
      intermediate: intermediate[index],
      plaintext,
      paddingTarget,
      oracleCalls: localCalls - callsBefore,
    });
  }

  void startCalls;
  void known;

  return {
    blockIndex,
    sweeps,
    disambiguations,
    bytes,
    totalCalls: localCalls,
  };
}
