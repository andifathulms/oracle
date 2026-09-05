// The cipher panel (DESIGN.md §5.6, PRD §6.3): a labelled box with the AES/toy
// toggle. Switching re-runs the attack; it succeeds identically and at the same
// cost. The panel states the point in one line: the cipher is not the weakness.
import { useStore } from '../../state/store';
import './cipher.css';

export function CipherPanel() {
  const { config, setCipher, recovery } = useStore();
  const calls = recovery.totalCalls;

  return (
    <section className="cipher" aria-label="Block cipher">
      <div className="cipher-box">
        <span className="cipher-io">Cᵢ</span>
        <div className="cipher-core">
          <span className="cipher-name">
            {config.cipher === 'aes' ? 'AES-128' : 'toy permutation'}
          </span>
          <span className="cipher-sub">Dₖ</span>
        </div>
        <span className="cipher-io">intermediate</span>
      </div>

      <div className="cipher-toggle" role="group" aria-label="Cipher choice">
        <button
          className={config.cipher === 'aes' ? 'on' : ''}
          aria-pressed={config.cipher === 'aes'}
          onClick={() => setCipher('aes')}
        >
          real AES
        </button>
        <button
          className={config.cipher === 'toy' ? 'on' : ''}
          aria-pressed={config.cipher === 'toy'}
          onClick={() => setCipher('toy')}
        >
          toy permutation
        </button>
      </div>

      <p className="cipher-point">
        the switch changes nothing about the attack. the same recovery, at the
        same cost{recovery.starved ? '' : ` (${calls.toLocaleString()} calls)`} —
        the cipher is not the weakness, the padding check is the hole.
      </p>
    </section>
  );
}
