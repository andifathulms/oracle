// The oracle: a sealed instrument with one lamp and one number (DESIGN.md §4.2).
// Nothing else — no history strip, no confidence, no hint. Its austerity is the
// guarantee that the attack works from one bit.
import { useStore } from '../../state/store';
import { Odometer } from '../../ui/Odometer';
import './oracle.css';

export function OraclePanel() {
  const { view, callsAt, config } = useStore();
  const sealed = config.mac;

  // Three display states, not two. 'idle' means no question has been asked yet,
  // and rendering it as "no" made the app look like it had already queried and
  // been refused, at the largest type size on the landing view. yes/no are now
  // reserved for actual replies; the void glyph stands for an absent one, the
  // same way it does in the stack.
  const word = view.lamp === 'valid' ? 'yes' : view.lamp === 'invalid' ? 'no' : '··';

  return (
    <aside className={`oracle panel ${sealed ? 'sealed' : ''}`} aria-label="The oracle">
      <div className="oracle-head">
        <h3 className="oracle-title">The oracle</h3>
        <span className="oracle-badge label">{sealed ? 'sealed' : 'padding check'}</span>
      </div>

      {/* The lamp: a bezel, a glass, and behind it the one bit. */}
      <div className="lamp-bezel">
        <div
          className={`lamp ${view.lamp}`}
          role="status"
          aria-live="polite"
          key={view.eventIndex}
        >
          <span className="lamp-glass" aria-hidden="true" />
          <span className="lamp-word">{word}</span>
        </div>
        <div className="lamp-ring" aria-hidden="true" />
      </div>

      <p className="oracle-question">Is the padding valid?</p>

      <div className="oracle-calls">
        <Odometer value={callsAt} className="calls-figure" />
        <span className="calls-label label">oracle calls</span>
      </div>

      <p className="oracle-note">
        {sealed
          ? 'Encrypt-then-MAC is on. The tag is checked first and fails before decryption, so every reply is the same.'
          : 'This oracle answers about a message the app encrypted itself. There is no network, so there is no other target to reach.'}
      </p>
    </aside>
  );
}
