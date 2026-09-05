// The message view (DESIGN.md §5.5): block-level progress at byte granularity,
// the plaintext accumulating, and the price. A block landing near 2,000 calls
// is the evidence that this is cheap rather than magical, so the number is
// given room and a bar to be read against.
import { useStore } from '../../state/store';
import { printable, isPrintable } from '../../ui/format';
import { Odometer } from '../../ui/Odometer';
import './message.css';

export function Message() {
  const { recovery, view, callsAt, seekBlock } = useStore();
  const size = recovery.blockSize;
  const totalBlocks = recovery.blocks.length;
  const totalBytes = totalBlocks * size;

  const found = new Map<number, number>();
  for (const b of view.recovered) found.set(b.blockIndex * size + b.index, b.plaintext);

  const perByte = view.recovered.length > 0 ? callsAt / view.recovered.length : 0;
  const pct = totalBytes > 0 ? (view.recovered.length / totalBytes) * 100 : 0;

  return (
    <section className="message panel" aria-label="Message recovery">
      {/* The ciphertext as blocks of sixteen. Each cell lights gold the moment
          its byte is recovered, so progress is legible at a glance and per
          byte, not per block. */}
      <div className="msg-map" role="group" aria-label="Recovery map">
        {Array.from({ length: totalBlocks }, (_, b) => (
          <button
            key={b}
            className={`msg-block ${b === view.currentBlock ? 'current' : ''}`}
            onClick={() => seekBlock(b)}
            aria-label={`Jump to block ${b + 1}`}
          >
            <span className="msg-block-label label">C{b + 1}</span>
            <span className="msg-block-cells">
              {Array.from({ length: size }, (_, i) => (
                <span key={i} className={`msg-bit ${found.has(b * size + i) ? 'on' : ''}`} />
              ))}
            </span>
          </button>
        ))}
      </div>

      <div className="msg-text-wrap">
        <span className="label msg-text-label">recovered plaintext</span>
        <p className="msg-text mono" aria-live="polite">
          {view.recovered.length === 0 ? (
            <span className="msg-empty">nothing recovered yet</span>
          ) : (
            Array.from({ length: totalBytes }, (_, i) => {
              const v = found.get(i);
              if (v === undefined) return <span key={i} className="ch void">·</span>;
              return (
                <span key={i} className={`ch ${isPrintable(v) ? '' : 'np'}`}>
                  {printable(v)}
                </span>
              );
            })
          )}
        </p>
      </div>

      <div className="msg-stats">
        <Stat
          figure={<Odometer value={callsAt} />}
          label="oracle calls"
          note="a 16-byte block is roughly 2,000 — cheap, not magical."
        />
        <Stat
          figure={
            perByte ? (
              <span className="mono">{perByte.toFixed(0)}</span>
            ) : (
              <span className="mono waiting">—</span>
            )
          }
          label="calls per byte"
          note="128 on average, because a byte is found halfway through 256 guesses."
        />
        <Stat
          figure={<span className="mono">{view.recovered.length}<span className="of">/{totalBytes}</span></span>}
          label="bytes recovered"
          note="right to left, one padding value at a time."
        />
      </div>

      <div className="msg-bar" aria-hidden="true">
        <span className="msg-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function Stat({ figure, label, note }: { figure: React.ReactNode; label: string; note: string }) {
  return (
    <div className="stat">
      <span className="stat-figure">{figure}</span>
      <span className="stat-label label">{label}</span>
      <span className="stat-note">{note}</span>
    </div>
  );
}
