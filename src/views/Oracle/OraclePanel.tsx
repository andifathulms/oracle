// The oracle: a sealed instrument with one lamp and one number (DESIGN.md §4.2).
// Nothing else — no history strip, no confidence, no hint. Its austerity is the
// guarantee that the attack works from one bit.
import { useStore } from '../../state/store';
import { Odometer } from '../../ui/Odometer';
import { VOID_GLYPH } from '../../ui/format';
import './oracle.css';

export function OraclePanel() {
  const { view, callsAt, config, rapid } = useStore();
  const sealed = config.mac;

  // Three display states, not two. 'idle' means no question has been asked yet,
  // and rendering it as "no" made the app look like it had already queried and
  // been refused, at the largest type size on the landing view. yes/no are now
  // reserved for actual replies; the void glyph stands for an absent one, the
  // same way it does in the stack.
  // Above the flash-safe speed the lamp holds steady instead of strobing green
  // once per recovered byte (WCAG 2.3.1). DESIGN.md §5.2 already asks for this
  // shape at fast-forward: the rejections blur into a rapid count and only the
  // accept and the disambiguation are held. Here the accepts blur too, because
  // at 600 steps a second nobody resolves them individually anyway.
  const word = rapid
    ? 'sweeping'
    : view.lamp === 'valid' ? 'yes' : view.lamp === 'invalid' ? 'no' : null;

  // No aria-label on the <aside>: it repeated the <h3> immediately inside it.
  return (
    <aside className={`oracle panel ${sealed ? 'sealed' : ''}`}>
      <div className="oracle-head">
        <h3 className="oracle-title">The oracle</h3>
        <span className="oracle-badge label">{sealed ? 'sealed' : 'padding check'}</span>
      </div>

      {/* The lamp: a bezel, a glass, and behind it the one bit.

          Not a live region. It used to be role=status keyed to remount on every
          oracle call, which at ~600 calls a second buried a screen reader. The
          word is still real text, so it can be read on demand; the app's single
          live region is <Announcer />, which speaks meaning rather than every
          individual bit. */}
      <div className="lamp-bezel">
        <div className={`lamp ${rapid ? 'rapid' : view.lamp}`}>
          <span className="lamp-glass" aria-hidden="true" />
          <span className="lamp-word">
            {word ?? (
              <>
                <span aria-hidden="true">{VOID_GLYPH}</span>
                <span className="visually-hidden">no question asked yet</span>
              </>
            )}
          </span>
        </div>
        <div className="lamp-ring" aria-hidden="true" />
      </div>

      <p className="oracle-question">Is the padding valid?</p>

      {/* The rule the oracle applies, stated where it is applied. Everything
          downstream depends on it: why forcing 01 proves anything, why 02 02 is
          also valid and creates the false positive, why perturbing byte 14
          settles it. The app used the concept in six places and defined it in
          none. */}
      <div className="oracle-rule">
        <p className="rule-name label">PKCS7 padding</p>
        <p className="rule-text">
          A message is padded so the last <em>n</em> bytes all hold the value <em>n</em>. The
          check passes only if they do.
        </p>
        <ul className="rule-examples" aria-label="Valid padding examples">
          <li><code>01</code></li>
          <li><code>02 02</code></li>
          <li><code>03 03 03</code></li>
          <li className="rule-more">up to sixteen bytes of <code>10</code></li>
        </ul>
        <p className="rule-text">
          The oracle answers this and nothing else. It never says which byte was wrong, or how
          close a guess came.
        </p>
      </div>

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
