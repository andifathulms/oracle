// The candidate field (DESIGN.md §2.2, §5.2): all 256 values a byte can take,
// as a 16×16 field. Untried values are holes. Tried-and-rejected values dim to
// almost nothing — a no is one failed guess among hundreds and must weigh that
// little. The accepted value is the only bright thing here.
//
// This is the asymmetry the palette is built around, made countable.
import { useStore } from '../../state/store';
import { hex } from '../../ui/format';
import './sweep.css';

export function CandidateField() {
  const { view } = useStore();
  const tried = new Set(view.tried);
  const current = view.candidate;
  const accepted = view.accepted;
  const idle = view.activeIndex == null;

  return (
    <section className={`field ${idle ? 'idle' : ''}`} aria-label="Candidate field">
      <header className="field-head">
        <h3 className="field-title label">candidates for byte {view.activeIndex ?? '··'}</h3>
        <span className="field-count mono">
          <span className="tried">{tried.size}</span>
          <span className="of">/256 asked</span>
        </span>
      </header>

      <div className="field-grid" role="img" aria-label={`${tried.size} of 256 candidates tried`}>
        {Array.from({ length: 256 }, (_, v) => {
          const state =
            v === accepted
              ? 'accepted'
              : v === current
                ? 'current'
                : tried.has(v)
                  ? 'rejected'
                  : 'untried';
          return <span key={v} className={`dot ${state}`} />;
        })}
      </div>

      <footer className="field-foot">
        <Key tone="untried" text="not asked" />
        <Key tone="rejected" text="no" />
        <Key tone="current" text={current == null ? 'asking' : `asking 0x${hex(current)}`} />
        <Key tone="accepted" text="yes" />
      </footer>
    </section>
  );
}

function Key({ tone, text }: { tone: string; text: string }) {
  return (
    <span className="field-key">
      <span className={`dot ${tone}`} aria-hidden="true" />
      <span className="label">{text}</span>
    </span>
  );
}
