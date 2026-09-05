// A flat, scrubbable event stream derived from the attack trace. The views
// replay this and never re-run the attack (CLAUDE.md §5). Building the trace up
// front makes scrubbing free — the whole recovery already exists.
import type { MessageRecovery, BlockRecovery } from '../engine';

export type TimelineEvent =
  | {
      kind: 'sweep';
      blockIndex: number;
      targetIndex: number;
      candidate: number;
      valid: boolean;
      craftedBlock: Uint8Array;
    }
  | {
      kind: 'disambiguate';
      blockIndex: number;
      targetIndex: 15;
      firstHit: number;
      perturbedProbe: Uint8Array;
      stillValid: boolean;
    }
  | {
      kind: 'commit';
      blockIndex: number;
      targetIndex: number;
      intermediate: number;
      plaintext: number;
      paddingTarget: number;
      oracleCalls: number;
    };

export interface RecoveredByte {
  blockIndex: number;
  index: number;
  intermediate: number;
  plaintext: number;
  paddingTarget: number;
}

export interface Timeline {
  events: TimelineEvent[];
  // For each event i, how many commits have occurred at or before it.
  commitCountAt: number[];
  // All commits in order.
  commits: RecoveredByte[];
  // Indices where each block begins (first event of that block).
  blockStart: number[];
}

// Reconstruct the chronological event order within one block from the
// structured trace. Sweeps carry all candidates in execution order (including
// resumed sweeps after a caught false positive); disambiguations sit at each
// last-byte hit.
function walkBlock(block: BlockRecovery, out: TimelineEvent[], commits: RecoveredByte[]): void {
  const commitByIndex = new Map<number, BlockRecovery['bytes'][number]>();
  for (const b of block.bytes) commitByIndex.set(b.index, b);

  let disambigCursor = 0;

  // Group sweeps by target index in the order the indices were attacked (15..0),
  // preserving array order within a group.
  const order: number[] = [];
  const byIndex = new Map<number, typeof block.sweeps>();
  for (const s of block.sweeps) {
    if (!byIndex.has(s.targetIndex)) {
      byIndex.set(s.targetIndex, []);
      order.push(s.targetIndex);
    }
    byIndex.get(s.targetIndex)!.push(s);
  }

  for (const index of order) {
    const sweeps = byIndex.get(index)!;
    for (const s of sweeps) {
      out.push({
        kind: 'sweep',
        blockIndex: block.blockIndex,
        targetIndex: s.targetIndex,
        candidate: s.candidate,
        valid: s.valid,
        craftedBlock: s.craftedBlock,
      });
      // On a valid last-byte hit, the disambiguation runs immediately after.
      if (index === 15 && s.valid) {
        const d = block.disambiguations[disambigCursor++];
        if (d) {
          out.push({
            kind: 'disambiguate',
            blockIndex: block.blockIndex,
            targetIndex: 15,
            firstHit: d.firstHit,
            perturbedProbe: d.perturbedProbe,
            stillValid: d.stillValid,
          });
        }
      }
    }
    // After the sweep for this index resolves, commit the byte (if recovered).
    const b = commitByIndex.get(index);
    if (b) {
      out.push({
        kind: 'commit',
        blockIndex: block.blockIndex,
        targetIndex: index,
        intermediate: b.intermediate,
        plaintext: b.plaintext,
        paddingTarget: b.paddingTarget,
        oracleCalls: b.oracleCalls,
      });
      commits.push({
        blockIndex: block.blockIndex,
        index,
        intermediate: b.intermediate,
        plaintext: b.plaintext,
        paddingTarget: b.paddingTarget,
      });
    }
  }
}

export function buildTimeline(recovery: MessageRecovery): Timeline {
  const events: TimelineEvent[] = [];
  const commits: RecoveredByte[] = [];
  const blockStart: number[] = [];

  for (const block of recovery.blocks) {
    blockStart.push(events.length);
    walkBlock(block, events, commits);
  }

  // Prefix count of commits at each event index.
  const commitCountAt = new Array<number>(events.length);
  let c = 0;
  for (let i = 0; i < events.length; i++) {
    if (events[i].kind === 'commit') c++;
    commitCountAt[i] = c;
  }

  return { events, commitCountAt, commits, blockStart };
}

// ---- View-state selector: O(1) given a timeline position ----

export interface ViewState {
  eventIndex: number;
  currentBlock: number;
  activeIndex: number | null; // byte column under attack, or null
  craftedBlock: Uint8Array | null; // current crafted previous block
  lamp: 'valid' | 'invalid' | 'idle';
  disambiguating: boolean;
  disambiguationOutcome: 'genuine' | 'false-positive' | null;
  recovered: RecoveredByte[]; // committed bytes so far
  lastCommit: RecoveredByte | null;
  candidate: number | null;
}

export function selectView(timeline: Timeline, index: number): ViewState {
  const clamped = Math.max(-1, Math.min(index, timeline.events.length - 1));
  if (clamped < 0) {
    return {
      eventIndex: -1,
      currentBlock: 0,
      activeIndex: null,
      craftedBlock: null,
      lamp: 'idle',
      disambiguating: false,
      disambiguationOutcome: null,
      recovered: [],
      lastCommit: null,
      candidate: null,
    };
  }
  const ev = timeline.events[clamped];
  const commitCount = timeline.commitCountAt[clamped];
  const recovered = timeline.commits.slice(0, commitCount);
  const lastCommit = commitCount > 0 ? timeline.commits[commitCount - 1] : null;

  let lamp: ViewState['lamp'] = 'idle';
  let crafted: Uint8Array | null = null;
  let activeIndex: number | null = null;
  let disambiguating = false;
  let disambiguationOutcome: ViewState['disambiguationOutcome'] = null;
  let candidate: number | null = null;

  if (ev.kind === 'sweep') {
    lamp = ev.valid ? 'valid' : 'invalid';
    crafted = ev.craftedBlock;
    activeIndex = ev.targetIndex;
    candidate = ev.candidate;
  } else if (ev.kind === 'disambiguate') {
    lamp = ev.stillValid ? 'valid' : 'invalid';
    crafted = ev.perturbedProbe;
    activeIndex = 15;
    disambiguating = true;
    disambiguationOutcome = ev.stillValid ? 'genuine' : 'false-positive';
  } else {
    // commit: keep the last crafted context by scanning back one step
    activeIndex = ev.targetIndex;
    lamp = 'valid';
    const prev = clamped > 0 ? timeline.events[clamped - 1] : null;
    if (prev && (prev.kind === 'sweep' || prev.kind === 'disambiguate')) {
      crafted = prev.kind === 'sweep' ? prev.craftedBlock : prev.perturbedProbe;
    }
  }

  return {
    eventIndex: clamped,
    currentBlock: ev.blockIndex,
    activeIndex,
    craftedBlock: crafted,
    lamp,
    disambiguating,
    disambiguationOutcome,
    recovered,
    lastCommit,
    candidate,
  };
}

// Fast-forward target: from the current index, the next event that is not a
// rejected sweep — i.e. the accepting sweep, a disambiguation, or a commit
// (DESIGN.md §5.2: rejections collapse, the mechanism is held).
export function collapseSweep(timeline: Timeline, from: number): number {
  for (let i = from + 1; i < timeline.events.length; i++) {
    const ev = timeline.events[i];
    if (ev.kind !== 'sweep' || ev.valid) return i;
  }
  return timeline.events.length - 1;
}
