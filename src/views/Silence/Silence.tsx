// The silence (DESIGN.md §5.7, PRD): the defence that actually closes the
// oracle. With encrypt-then-MAC on, the tag is checked before anything is
// decrypted, so every reply is the same and the sweep learns nothing.
//
// One line of copy and then stop. No summary, no celebration.
import { useStore } from '../../state/store';
import './silence.css';

export function Silence() {
  const { config, setMac, recovery, view, callsAt } = useStore();
  const on = config.mac;

  return (
    <section className={`silence panel ${on ? 'on' : ''}`} aria-label="Encrypt-then-MAC">
      <header className="silence-head">
        <h3 className="silence-title">encrypt-then-MAC</h3>
        <button className={on ? 'on sealed' : ''} aria-pressed={on} onClick={() => setMac(!on)}>
          MAC {on ? 'on' : 'off'}
        </button>
      </header>

      {/* The pipeline. With the MAC on, the reply is decided at the first gate
          and the decryption behind it is never reached. */}
      <ol className="gates">
        <Gate
          n="1"
          name="check the tag"
          detail="HMAC over the ciphertext"
          state={on ? 'active' : 'absent'}
        />
        <Gate
          n="2"
          name="decrypt"
          detail="Dₖ over each block"
          state={on ? 'unreached' : 'active'}
        />
        <Gate
          n="3"
          name="check the padding"
          detail="the leak, when it is reached"
          state={on ? 'unreached' : 'leak'}
        />
      </ol>

      <div className="silence-outcome">
        <span className={`silence-lamp ${on ? 'dead' : 'live'}`} aria-hidden="true" />
        <p className="silence-line">
          {on
            ? 'the oracle now says the same thing to every question, so there is nothing to learn from it.'
            : 'without a tag, an invalid padding and a valid one are distinguishable, and one bit is enough.'}
        </p>
      </div>

      <dl className="silence-figures">
        <Figure k="bytes recovered" v={on ? '0' : String(view.recovered.length)} dead={on} />
        <Figure k="calls spent" v={callsAt.toLocaleString()} dead={on} />
        <Figure k="oracle" v={recovery.starved ? 'starved' : 'leaking'} dead={on} word />
      </dl>
    </section>
  );
}

function Gate({
  n, name, detail, state,
}: { n: string; name: string; detail: string; state: string }) {
  return (
    <li className={`gate ${state}`}>
      <span className="gate-n label">{n}</span>
      <span className="gate-body">
        <span className="gate-name">{name}</span>
        <span className="gate-detail label">{detail}</span>
      </span>
      <span className="gate-state label">
        {state === 'active' ? 'runs' : state === 'leak' ? 'leaks' : state === 'unreached' ? 'never reached' : 'not present'}
      </span>
    </li>
  );
}

function Figure({ k, v, dead, word }: { k: string; v: string; dead: boolean; word?: boolean }) {
  return (
    <div className={`sfig ${dead ? 'dead' : ''} ${word ? 'word' : ''}`}>
      <dt className="label">{k}</dt>
      <dd className="mono">{v}</dd>
    </div>
  );
}
