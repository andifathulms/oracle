// The hero: four aligned rows of 16 byte-cells (DESIGN.md §4.3, §5.1).
// Crafted (blue, attacker-controlled), seen (the padding the oracle actually
// judges), intermediate (void → gold), plaintext (void → gold). The
// intermediate row fills right to left as the attack runs.
//
// A resolved byte is a button: hovering or focusing it opens the full
// derivation, so any single byte's claim can be audited without replaying the
// sweep (DESIGN.md §5.1). Everything in the popover is computed from public
// values and recovered values — never from the key.
import { useState } from 'react';
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

      {/* The relation every row below depends on. It was only drawn in the
          cipher panel, three scenes further down, so scenes 01 to 03 used
          "intermediate" and "real previous" before anything said where they
          come from. */}
      <p className="stack-law">
        CBC decrypts each block as <b>plaintext = intermediate ⊕ previous ciphertext block</b>,
        where the <b>intermediate</b> is D<sub>k</sub>(C), the block cipher applied to this block.
        The key exists only inside D<sub>k</sub>, and the attack never gets there.{' '}
        {block === 0
          ? 'For the first block the previous block is the IV, which is sent in the clear, so the attacker has it like any other.'
          : `For block C${block + 1} the previous block is C${block}, which the attacker captured with the rest of the ciphertext.`}
      </p>

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
              row="intermediate"
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
              row="plaintext"
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

// The row's own name is a class as well as a tone: `tone` is shared (both gold
// rows use it), and some rules need to reach one row rather than both.
function RowLabel({ label, note, tone }: { label: string; note: string; tone: string }) {
  return (
    <div className={`row-label ${tone} row-${label}`}>
      <span className="row-name">{label}</span>
      <span className="row-note label">{note}</span>
    </div>
  );
}

// A resolved byte, with its derivation on hover or focus.
function Byte({
  className,
  row,
  text,
  index,
  r,
  realPrev,
}: {
  className: string;
  row: string;
  text: string;
  index: number;
  r: { intermediate: number; plaintext: number; paddingTarget: number };
  realPrev: number;
}) {
  const craftedByte = r.intermediate ^ r.paddingTarget;
  const [open, setOpen] = useState(false);

  // The derivation is content, not a name. It used to be sealed behind
  // aria-label={`Byte N derivation`}, which overrides everything inside the
  // button, so a screen reader heard the label and never the byte value, the
  // two XOR lines or the decoded character. The app's audit affordance, the
  // thing that shows a byte was derived rather than known, was the one part of
  // the app assistive tech could not reach (WCAG 4.1.2, 1.3.1).
  //
  // So: no aria-label. The button is named by its own visible text plus a
  // visually-hidden row word, and the derivation is associated as a
  // description rather than swallowed into the name.
  const describedBy = `derive-${row}-${index}`;

  return (
    <button
      className={`cell ${className} ${open ? 'open' : ''}`}
      type="button"
      aria-expanded={open}
      aria-describedby={describedBy}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => {
        // WCAG 1.4.13: content shown on hover or focus must be dismissible
        // without moving the pointer or the focus.
        if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
      }}
      onBlur={() => setOpen(false)}
    >
      <span className="visually-hidden">{row} byte {index}: </span>
      <span className="cell-text">{text}</span>
      <span className="derive" role="tooltip" id={describedBy}>
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
