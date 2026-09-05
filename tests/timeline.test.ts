import { describe, it, expect } from 'vitest';
import { buildTarget } from '../src/engine/secret';
import { recoverMessage } from '../src/engine/attack/message';
import { buildTimeline, selectView, collapseSweep } from '../src/state/timeline';
import { bytesToString } from '../src/engine/bytes';

describe('timeline reconstruction', () => {
  it('final selected view exposes every recovered byte and matches the plaintext', () => {
    const msg = 'the cipher was never the weakness here';
    const target = buildTarget({ seed: 'tl', cipher: 'aes', mac: false, message: msg });
    const recovery = recoverMessage(target);
    const tl = buildTimeline(recovery);

    const end = selectView(tl, tl.events.length - 1);
    expect(end.recovered.length).toBe(recovery.plaintextPadded.length);

    // Reassemble plaintext from the timeline's committed bytes.
    const bytes = new Uint8Array(recovery.plaintextPadded.length);
    for (const b of end.recovered) bytes[b.blockIndex * 16 + b.index] = b.plaintext;
    // Strip padding the same way the engine does by comparing to padded form.
    expect(bytesToString(bytes.slice(0, msg.length))).toBe(msg);
  });

  it('commit counts are monotonic and lamp reflects each event', () => {
    const target = buildTarget({ seed: 'tl2', cipher: 'toy', mac: false, message: 'short' });
    const tl = buildTimeline(recoverMessage(target));
    let last = 0;
    for (let i = 0; i < tl.events.length; i++) {
      expect(tl.commitCountAt[i]).toBeGreaterThanOrEqual(last);
      last = tl.commitCountAt[i];
      const v = selectView(tl, i);
      const ev = tl.events[i];
      if (ev.kind === 'sweep') expect(v.lamp).toBe(ev.valid ? 'valid' : 'invalid');
    }
    expect(last).toBe(16); // one block, 16 bytes
  });

  it('collapseSweep skips rejected candidates to the next meaningful event', () => {
    const target = buildTarget({ seed: 'tl3', cipher: 'aes', mac: false, message: 'jump' });
    const tl = buildTimeline(recoverMessage(target));
    const next = collapseSweep(tl, 0);
    const ev = tl.events[next];
    expect(ev.kind !== 'sweep' || ev.valid).toBe(true);
  });
});
