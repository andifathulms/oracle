// The oracle: a sealed instrument with one lamp and one number (DESIGN.md §4.2).
// Nothing else — no history strip, no confidence, no hint. Its austerity is the
// guarantee that the attack works from one bit.
import { useStore } from '../../state/store';
import { Odometer } from '../../ui/Odometer';
import './oracle.css';

export function OraclePanel() {
  const { view, callsAt, config } = useStore();
  const on = view.lamp === 'valid';
  const sealed = config.mac;

  return (
    <aside className={`oracle panel ${sealed ? 'sealed' : ''}`} aria-label="The oracle">
      <div className="oracle-head">
        <h3 className="oracle-title">the oracle</h3>
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
          <span className="lamp-word">{on ? 'yes' : 'no'}</span>
        </div>
        <div className="lamp-ring" aria-hidden="true" />
      </div>

      <p className="oracle-question">is the padding valid?</p>

      <div className="oracle-calls">
        <Odometer value={callsAt} className="calls-figure" />
        <span className="calls-label label">oracle calls</span>
      </div>

      <p className="oracle-note">
        {sealed
          ? 'encrypt-then-MAC is on. the tag is checked first and fails before decryption, so every reply is the same.'
          : 'this oracle answers about a message the app encrypted itself. there is no network, so there is no other target to reach.'}
      </p>
    </aside>
  );
}
