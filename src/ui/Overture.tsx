// The opening statement. Before this existed, the first thing a visitor met was
// a frozen instrument: an idle counter reading 0 and an idle lamp reading "no",
// with the only explanation of the app set 12px in the masthead. The overture
// says what the app is in plain language, states the stakes, and offers the one
// action that makes the rest legible.
//
// It renders no attack state and drives no logic. The button is a second
// trigger for the transport's existing toggle().
import { useStore } from '../state/store';
import './overture.css';

export function Overture() {
  const { playing, index, toggle } = useStore();

  const cta = playing
    ? 'Pause the recovery'
    : index < 0
      ? 'Watch it recover the message'
      : 'Resume the recovery';

  return (
    <header className="overture">
      <h1 className="overture-title">
        Read a message
        <br />
        without its key.
      </h1>

      <p className="overture-lede">
        A server that reveals only whether a message&rsquo;s padding is valid leaks enough to
        rebuild the entire message. This runs that attack live, and never hands the screen the
        key or the plaintext.
      </p>

      <button className="overture-cta" onClick={toggle}>
        {cta}
      </button>
    </header>
  );
}
