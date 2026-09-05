// The XOR resolution (DESIGN.md §5.4): the two relationships shown as physical
// operations when a byte commits.
//   intermediate = crafted ⊕ padding_target
//   plaintext    = intermediate ⊕ real_previous
//
// Both lines are computed from the accepted guess, the padding value the round
// forced, and the public previous ciphertext block. Nothing here touches the
// key — which is the point, and why the line is worth drawing at all.
import { useStore } from '../../state/store';
import { hex, printable, isPrintable } from '../../ui/format';
import './xor.css';

export function XorResolve() {
  const { view, recovery, target } = useStore();
  const commit = view.lastCommit;

  if (!commit) {
    return (
      <section className="xor idle panel" aria-label="XOR resolution">
        <div className="xor-empty">
          <span className="label">waiting</span>
          <p>A byte resolves here as each one is recovered. Run the sweep.</p>
        </div>
      </section>
    );
  }

  const paddingTarget = commit.paddingTarget;
  const crafted = commit.intermediate ^ paddingTarget;
  const size = recovery.blockSize;
  const realPrev =
    commit.blockIndex === 0
      ? target.iv
      : target.ciphertext.slice((commit.blockIndex - 1) * size, commit.blockIndex * size);
  const prevByte = realPrev[commit.index];
  const stamp = `${commit.blockIndex}:${commit.index}`;

  return (
    <section className="xor panel" aria-label="XOR resolution" key={stamp}>
      <Line
        note="The oracle accepted this crafted byte, so the decrypted byte under it must equal the padding value."
        step="1"
        terms={[
          { label: 'crafted', val: hex(crafted), kind: 'crafted' },
          { label: 'pad', val: hex(paddingTarget), kind: 'pad' },
        ]}
        out={{ label: 'intermediate', val: hex(commit.intermediate), kind: 'gold' }}
      />
      <Line
        note="CBC says the plaintext is the intermediate exclusive-or'd with the real previous ciphertext block, which the attacker already has."
        step="2"
        terms={[
          { label: 'intermediate', val: hex(commit.intermediate), kind: 'gold' },
          { label: 'real previous', val: hex(prevByte), kind: 'crafted' },
        ]}
        out={{
          label: 'plaintext',
          val: hex(commit.plaintext),
          kind: 'gold',
          char: isPrintable(commit.plaintext) ? printable(commit.plaintext) : undefined,
        }}
      />
      <p className="xor-key label">No key was used on either line.</p>
    </section>
  );
}

interface TermSpec { label: string; val: string; kind: string; char?: string | undefined }

function Line({
  step, note, terms, out,
}: { step: string; note: string; terms: TermSpec[]; out: TermSpec }) {
  return (
    <div className="xor-line">
      <span className="xor-step label">{step}</span>
      <div className="xor-eq">
        <Term {...terms[0]} />
        <span className="xor-op" aria-hidden="true">⊕</span>
        <Term {...terms[1]} />
        <span className="xor-op eq" aria-hidden="true">=</span>
        <Term {...out} out />
      </div>
      <p className="xor-note">{note}</p>
    </div>
  );
}

function Term({ label, val, kind, char, out }: TermSpec & { out?: boolean }) {
  return (
    <span className={`term ${kind} ${out ? 'is-out' : ''}`}>
      <span className="term-val">
        {val}
        {char ? <span className="term-char">'{char}'</span> : null}
      </span>
      <span className="term-label label">{label}</span>
    </span>
  );
}
