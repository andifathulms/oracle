// The XOR resolution (DESIGN.md §5.4): the two relationships shown as physical
// operations when a byte commits.
//   intermediate = crafted ⊕ padding_target
//   plaintext    = intermediate ⊕ real_previous
import { useStore } from '../../state/store';
import { hex, printable, isPrintable } from '../../ui/format';
import './xor.css';

export function XorResolve() {
  const { view, recovery, target } = useStore();
  const commit = view.lastCommit;

  if (!commit) {
    return (
      <section className="xor idle" aria-label="XOR resolution">
        <p className="xor-wait">a byte resolves here as each one is recovered.</p>
      </section>
    );
  }

  // Recompute the display quantities from recovered values only (no secret).
  const paddingTarget = commit.paddingTarget;
  const crafted = commit.intermediate ^ paddingTarget; // crafted byte that hit
  const blocks = splitCipher(recovery, target);
  const realPrev = blocks.realPrevious(commit.blockIndex)[commit.index];

  return (
    <section className="xor" aria-label="XOR resolution">
      <div className="xor-line">
        <Term label="crafted" val={hex(crafted)} kind="crafted" />
        <Op>⊕</Op>
        <Term label="pad" val={hex(paddingTarget)} kind="pad" />
        <Op>=</Op>
        <Term label="intermed" val={hex(commit.intermediate)} kind="recovered" />
      </div>
      <div className="xor-line">
        <Term label="intermed" val={hex(commit.intermediate)} kind="recovered" />
        <Op>⊕</Op>
        <Term label="realprev" val={hex(realPrev)} kind="crafted" />
        <Op>=</Op>
        <Term
          label="plain"
          val={hex(commit.plaintext)}
          {...(isPrintable(commit.plaintext) ? { char: printable(commit.plaintext) } : {})}
          kind="recovered"
        />
      </div>
    </section>
  );
}

function Term({
  label,
  val,
  char,
  kind,
}: {
  label: string;
  val: string;
  char?: string;
  kind: string;
}) {
  return (
    <span className={`term ${kind}`}>
      <span className="term-label">{label}</span>
      <span className="term-val">
        {val}
        {char ? <span className="term-char"> '{char}'</span> : null}
      </span>
    </span>
  );
}

const Op = ({ children }: { children: React.ReactNode }) => <span className="xor-op">{children}</span>;

// Helper to get the real previous block bytes for a given block, from public
// ciphertext + IV only (never the key).
function splitCipher(
  recovery: ReturnType<typeof useStore>['recovery'],
  target: ReturnType<typeof useStore>['target'],
) {
  const size = recovery.blockSize;
  return {
    realPrevious(blockIndex: number): Uint8Array {
      if (blockIndex === 0) return target.iv;
      return target.ciphertext.slice((blockIndex - 1) * size, blockIndex * size);
    },
  };
}
