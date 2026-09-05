// The message view (DESIGN.md §5.5): block-level progress and the recovered
// plaintext accumulating, with the prominent oracle-call counter.
import { useStore } from '../../state/store';
import { printable } from '../../ui/format';
import './message.css';

export function Message() {
  const { recovery, view, callsAt, target } = useStore();
  const totalBlocks = recovery.blocks.length || Math.ceil(target.ciphertext.length / 16);

  // Assemble the recovered text so far from committed bytes.
  const size = recovery.blockSize;
  const buf = new Map<number, number>();
  for (const b of view.recovered) buf.set(b.blockIndex * size + b.index, b.plaintext);
  const chars: string[] = [];
  const maxLen = target.ciphertext.length;
  for (let i = 0; i < maxLen; i++) {
    if (buf.has(i)) chars.push(printable(buf.get(i)!));
    else chars.push('');
  }
  const text = chars.join('');

  return (
    <section className="message" aria-label="Message recovery">
      <div className="message-head">
        <h2 className="message-title">message</h2>
        <div className="message-progress" aria-hidden="true">
          {Array.from({ length: totalBlocks }, (_, i) => (
            <span
              key={i}
              className={`blockdot ${i < view.currentBlock ? 'done' : ''} ${
                i === view.currentBlock ? 'current' : ''
              }`}
            />
          ))}
        </div>
        <span className="message-block">
          block {view.currentBlock + 1} of {totalBlocks}
        </span>
      </div>

      <div className="message-text mono" aria-live="polite">
        {text ? text : <span className="message-empty">nothing recovered yet</span>}
      </div>

      <div className="message-calls">
        <span className="calls-big">{callsAt.toLocaleString()}</span>
        <span className="calls-note">
          oracle calls — a 16-byte block is roughly 2,000, so this is cheap, not
          magical.
        </span>
      </div>
    </section>
  );
}
