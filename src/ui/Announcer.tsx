// The app's one live region.
//
// The oracle lamp used to be role=status aria-live=polite, keyed to remount on
// every oracle call. The speed scrubber runs to ~600 calls a second, so a
// screen reader was handed hundreds of "yes"/"no" utterances per second: it
// either fell minutes behind or stopped responding, and the app's central view
// became unusable. Volume of status messages is not the same as access to them.
//
// So this announces meaning rather than mechanism, and only while the sweep is
// stopped. Playing, nothing is announced, because nobody can follow 600 events
// a second and the visual lamp is the right channel for that. Paused, stepped,
// finished or seeked, the reader gets one sentence describing where the
// recovery actually is. Single-step therefore reads as one clean announcement
// per oracle call, which is the mode a screen reader user will want.
//
// No timers and no throttling heuristic: the condition is `playing`, which is
// state the store already holds.
import { useStore } from '../state/store';
import { hex, printable } from './format';

export function Announcer() {
  const { view, playing, recovery, callsAt } = useStore();

  const total = recovery.blocks.length * recovery.blockSize;
  const done = view.recovered.length;

  let message = '';
  if (!playing) {
    if (done === 0) {
      message = `Recovery not started. ${callsAt} oracle calls.`;
    } else {
      const c = view.lastCommit;
      const latest = c
        ? ` Latest: block ${c.blockIndex + 1}, byte ${c.index} is 0x${hex(c.plaintext)}, ${printable(c.plaintext)}.`
        : '';
      message = `${done} of ${total} bytes recovered.${latest} ${callsAt} oracle calls.`;
    }
    if (recovery.starved) {
      message += ' The oracle is starved: every reply is the same, so nothing can be learned.';
    }
  }

  return (
    <div className="visually-hidden" role="status" aria-live="polite">
      {message}
    </div>
  );
}
