// The hero: four aligned rows of 16 byte-cells (DESIGN.md §4.3, §5.1).
// Crafted (blue, attacker-controlled), seen (the padding the oracle actually
// judges), intermediate (void → gold), plaintext (void → gold). The
// intermediate row fills right to left as the attack runs.
//
// A resolved byte is a button: hovering or focusing it opens the full
// derivation, so any single byte's claim can be audited without replaying the
// sweep (DESIGN.md §5.1). Everything in the popover is computed from public
// values and recovered values — never from the key.
import { useStore } from '../../state/store';
import { hex, printable } from '../../ui/format';
import './stack.css';

const COLS = 16;

export function Stack() {
  const { view, recovery, target, reducedMotion, seekBlock } = useStore();
  const totalBlocks = Math.max(1, recovery.blocks.length);
  const block = view.currentBlock;

  const recovered = new Map<number, { intermediate: number; plaintext: number; paddingTarget: number }>();
  for (const b of view.recovered) {
    if (b.blockIndex === block) recovered.set(b.index, b);
  }

  const crafted = view.craftedBlock;
  const active = view.activeIndex;
  const justCommitted =
    view.lastCommit && view.lastCommit.blockIndex === block ? view.lastCommit.index : -1;
  const realPrev =
    block === 0 ? target.iv : target.ciphertext.slice((block - 1) * 16, block * 16);

  const cols = Array.from({ length: COLS }, (_, i) => i);

  return (
    <section className="stack" aria-label={`Recovery stack, block ${block + 1}`}>
      <div className="stack-legend">
        <div className="block-chips" role="group" aria-label="Jump to block">
          {Array.from({ length: totalBlocks }, (_, i) => (
            <button
              key={i}
              className={`chip ${i === block ? 'on' : ''} ${i < block ? 'done' : ''}`}
              aria-pressed={i === block}
              onClick={() => seekBlock(i)}
            >
              C{i + 1}
            </button>
          ))}
        </div>
        <span className="stack-dir label">recovered right → left</span>
      </div>

      <div className="stack-grid">
        {/* The beam: a column of light through all four rows, marking the byte
            under attack. A raise, not a colour (DESIGN.md §4.3). */}
        {active != null ? (
          <div
            className="beam"
            style={{
              left: `calc(var(--label-w) + var(--colgap) + ${active} * (var(--cellw) + var(--colgap)))`,
            }}
            aria-hidden="true"
          />
        ) : null}

        <RowLabel label="crafted" note="the block the attacker sends" tone="crafted" />
        {cols.map((i) => {
          const val = crafted ? crafted[i] : null;
          return (
            <div
              key={`c${i}`}
              className={`cell crafted ${active === i ? 'active' : ''} ${val == null ? 'blank' : ''}`}
            >
              {val == null ? '··' : hex(val)}
            </div>
          );
        })}

        {/* P_seen = intermediate ⊕ crafted (PRD §2). The quantity the oracle
            actually judges, and the one term of the mechanism the stack never
            drew. Knowable only where the intermediate is known, which is
            exactly the forced tail — so the row shows the padding being held
            at 03 03 03 while the next byte sweeps, and stays void everywhere
            the attacker is still guessing. It reveals nothing the attack does
            not already have. */}
        <RowLabel label="seen" note="what the oracle judges" tone="seen" />
        {cols.map((i) => {
          const r = recovered.get(i);
          const seen = r && crafted ? (r.intermediate ^ crafted[i]) & 0xff : null;
          if (seen == null) {
            return <div key={`s${i}`} className={`cell seen void ${active === i ? 'active' : ''}`} />;
          }
          return (
            <div key={`s${i}`} className={`cell seen known ${active === i ? 'active' : ''}`}>
              {hex(seen)}
            </div>
          );
        })}

        <RowLabel label="intermed" note="Dₖ(Cᵢ), never the key" tone="gold" />
        {cols.map((i) => {
          const r = recovered.get(i);
          const arriving = justCommitted === i && !reducedMotion;
          if (!r) {
            return (
              <div
                key={`i${i}`}
                className={`cell intermediate void ${active === i ? 'active' : ''}`}
              />
            );
          }
          return (
            <Byte
              key={`i${i}`}
              className={`intermediate known ${arriving ? 'arriving' : ''}`}
              text={hex(r.intermediate)}
              index={i}
              r={r}
              realPrev={realPrev[i]}
            />
          );
        })}

        <RowLabel label="plain" note="the message" tone="gold" />
        {cols.map((i) => {
          const r = recovered.get(i);
          const arriving = justCommitted === i && !reducedMotion;
          if (!r) return <div key={`p${i}`} className={`cell plain void ${active === i ? 'active' : ''}`} />;
          return (
            <Byte
              key={`p${i}`}
              className={`plain known ${arriving ? 'arriving' : ''}`}
              text={printable(r.plaintext)}
              index={i}
              r={r}
              realPrev={realPrev[i]}
            />
          );
        })}

        <span className="addr-label label" aria-hidden="true">byte</span>
        {cols.map((i) => (
          <div key={`a${i}`} className={`addr ${active === i ? 'on' : ''}`} aria-hidden="true">
            {i}
          </div>
        ))}
      </div>
    </section>
  );
}

function RowLabel({ label, note, tone }: { label: string; note: string; tone: string }) {
  return (
    <div className={`row-label ${tone}`}>
      <span className="row-name">{label}</span>
      <span className="row-note label">{note}</span>
    </div>
  );
}

// A resolved byte, with its derivation on hover or focus.
function Byte({
  className,
  text,
  index,
  r,
  realPrev,
}: {
  className: string;
  text: string;
  index: number;
  r: { intermediate: number; plaintext: number; paddingTarget: number };
  realPrev: number;
}) {
  const craftedByte = r.intermediate ^ r.paddingTarget;
  return (
    <button className={`cell ${className}`} type="button" aria-label={`Byte ${index} derivation`}>
      <span className="cell-text">{text}</span>
      <span className="derive" role="tooltip">
        <span className="derive-head label">byte {index}</span>
        <DeriveLine a={hex(craftedByte)} at="crafted" op="⊕" b={hex(r.paddingTarget)} bt="pad" out={hex(r.intermediate)} ot="intermed" />
        <DeriveLine a={hex(r.intermediate)} at="intermed" op="⊕" b={hex(realPrev)} bt="realprev" out={hex(r.plaintext)} ot="plain" />
        <span className="derive-char">
          0x{hex(r.plaintext)} is <strong>'{printable(r.plaintext)}'</strong>
        </span>
      </span>
    </button>
  );
}

function DeriveLine({
  a, at, op, b, bt, out, ot,
}: { a: string; at: string; op: string; b: string; bt: string; out: string; ot: string }) {
  return (
    <span className="derive-line">
      <em>{a}</em><span className="dl">{at}</span>
      <span className="op">{op}</span>
      <em>{b}</em><span className="dl">{bt}</span>
      <span className="op">=</span>
      <em className="gold">{out}</em><span className="dl">{ot}</span>
    </span>
  );
}
