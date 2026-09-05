// The channel (DESIGN.md §1): the thin thing between the attacker and the
// oracle, and the reason the app is unsettling. A whole 16-byte block goes
// out; one bit comes back. The aperture narrows to a slot to say so.
//
// Each query re-mounts the pulse by keying it on the event index, which
// restarts the CSS animation exactly once per oracle call — no timers, no
// state, and it stays in step with the scrub head at any speed.
import { useStore } from '../../state/store';
import './channel.css';

export function Channel() {
  const { view, config, reducedMotion } = useStore();
  const live = view.eventIndex >= 0 && view.lamp !== 'idle';
  const answered = view.lamp === 'valid';

  return (
    <div className={`channel ${live ? 'live' : ''} ${config.mac ? 'sealed' : ''}`} aria-hidden="true">
      <div className="channel-wire">
        <span className="wire-rail top" />
        <span className="wire-rail bottom" />
        <span className="wire-line" />
        <span className="wire-slot" />
        {live && !reducedMotion ? (
          <span key={`q${view.eventIndex}`} className="pulse out" />
        ) : null}
        {live && !reducedMotion ? (
          <span key={`a${view.eventIndex}`} className={`pulse back ${answered ? 'yes' : 'no'}`} />
        ) : null}
      </div>

      <div className="channel-legend">
        <span className="label out">128 bits out</span>
        <span className="label back">1 bit back</span>
      </div>
    </div>
  );
}
