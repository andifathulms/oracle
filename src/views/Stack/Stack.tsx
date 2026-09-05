// The hero: three aligned rows of 16 byte-cells (DESIGN.md §4.3, §5.1).
// Crafted (blue, attacker-controlled), intermediate (void → gold), plaintext
// (void → gold). The intermediate row fills right to left as the attack runs.
import { useStore } from '../../state/store';
import { hex, printable } from '../../ui/format';
import './stack.css';

const COLS = 16;

export function Stack() {
  const { view, recovery, reducedMotion } = useStore();
  const totalBlocks = Math.max(1, recovery.blocks.length);
  const block = view.currentBlock;

  // Recovered bytes for the current block, indexed 0..15.
  const recovered = new Map<number, { intermediate: number; plaintext: number }>();
  for (const b of view.recovered) {
    if (b.blockIndex === block) recovered.set(b.index, b);
  }

  const crafted = view.craftedBlock;
  const active = view.activeIndex;
  const justCommitted =
    view.lastCommit && view.lastCommit.blockIndex === block ? view.lastCommit.index : -1;

  const cols = Array.from({ length: COLS }, (_, i) => i);

  return (
    <section className="stack" aria-label={`Recovery stack, block ${block + 1}`}>
      <div className="stack-legend">
        <span>block {block + 1} of {totalBlocks}</span>
        <span className="stack-dir">right → left</span>
      </div>

      <StackRow label="crafted" hint={active != null ? '← sweeping' : ''}>
        {cols.map((i) => {
          const val = crafted ? crafted[i] : null;
          const isActive = active === i;
          return (
            <div
              key={i}
              className={`cell crafted ${isActive ? 'active' : ''} ${val == null ? 'blank' : ''}`}
            >
              {val == null ? '' : hex(val)}
            </div>
          );
        })}
      </StackRow>

      <StackRow label="intermed" hint={active != null ? '← found' : ''}>
        {cols.map((i) => {
          const r = recovered.get(i);
          const isActive = active === i && !r;
          const arriving = justCommitted === i && !reducedMotion;
          return (
            <div
              key={i}
              className={`cell intermediate ${r ? 'known' : 'void'} ${
                isActive ? 'active' : ''
              } ${arriving ? 'arriving' : ''}`}
            >
              {r ? hex(r.intermediate) : ''}
            </div>
          );
        })}
      </StackRow>

      <StackRow label="plain">
        {cols.map((i) => {
          const r = recovered.get(i);
          const arriving = justCommitted === i && !reducedMotion;
          return (
            <div
              key={i}
              className={`cell plain ${r ? 'known' : 'void'} ${arriving ? 'arriving' : ''}`}
              title={r ? `0x${hex(r.plaintext)}` : ''}
            >
              {r ? printable(r.plaintext) : ''}
            </div>
          );
        })}
      </StackRow>

      <div className="stack-addr" aria-hidden="true">
        {cols.map((i) => (
          <div key={i} className="addr">{15 - i}</div>
        ))}
      </div>
    </section>
  );
}

function StackRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="stack-row">
      <div className="row-label">
        {label}
        {hint ? <span className="row-hint">{hint}</span> : null}
      </div>
      <div className="row-cells">{children}</div>
    </div>
  );
}
