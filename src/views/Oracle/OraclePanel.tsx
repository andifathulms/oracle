// The oracle: a sealed box with one lamp and one number (DESIGN.md §4.2).
// Nothing else — its austerity is the guarantee the attack works from one bit.
import { useStore } from '../../state/store';
import './oracle.css';

export function OraclePanel() {
  const { view, callsAt, config } = useStore();
  const on = view.lamp === 'valid';
  const sealed = config.mac;

  return (
    <aside className={`oracle ${sealed ? 'sealed' : ''}`} aria-label="The oracle">
      <h2 className="oracle-title">the oracle</h2>
      <div
        className={`lamp ${view.lamp}`}
        role="status"
        aria-live="polite"
      >
        <span className="lamp-word">{on ? 'yes' : 'no'}</span>
      </div>
      <div className="oracle-calls">
        <span className="calls-figure">{callsAt.toLocaleString()}</span>
        <span className="calls-label">oracle calls</span>
      </div>
      {sealed ? (
        <p className="oracle-note">
          encrypt-then-MAC is on. the tag is checked first and fails before
          decryption, so every reply is the same.
        </p>
      ) : (
        <p className="oracle-note">
          this oracle answers about a message the app encrypted itself. there is
          no network, so there is no other target to reach.
        </p>
      )}
    </aside>
  );
}
