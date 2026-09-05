// The transport (DESIGN.md §4.1 bottom row), pinned to the bottom of the
// viewport so the sweep is always drivable while reading any scene.
//
// Continuous controls — the scrub head and the speed scrubber — map directly
// with zero easing. Discrete controls — cipher, MAC — get a timed transition
// (CLAUDE.md §6).
import { useStore } from '../state/store';
import { hex } from './format';
import './transport.css';

export function Transport() {
  const {
    playing, toggle, step, fastForward, restart,
    config, setSpeed, setMac, setCipher, newSeed,
    timeline, index, view, callsAt, recovery, seek,
  } = useStore();

  const total = Math.max(1, timeline.events.length - 1);
  const pct = index < 0 ? 0 : (index / total) * 100;
  const done = view.recovered.length;
  const totalBytes = recovery.blocks.length * recovery.blockSize;

  return (
    <div className="transport" role="group" aria-label="Sweep transport">
      <div className="transport-scrub">
        <div className="scrub-track" aria-hidden="true">
          <div className="scrub-fill" style={{ width: `${pct}%` }} />
          {timeline.blockStart.map((s, i) => (
            <span key={i} className="scrub-tick" style={{ left: `${(s / total) * 100}%` }} />
          ))}
          <span className="scrub-head" style={{ left: `${pct}%` }} />
        </div>
        <input
          className="scrub-input"
          type="range"
          min={-1}
          max={timeline.events.length - 1}
          step={1}
          value={index}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Scrub the recovery trace"
        />
      </div>

      <div className="transport-inner">
        <div className="t-group t-play">
          <button className="primary play" onClick={toggle} aria-label={playing ? 'Pause sweep' : 'Play sweep'}>
            <span className="glyph" aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
            {playing ? 'pause' : 'sweep'}
          </button>
          <button onClick={step} aria-label="Single step, one oracle call" title="→">step</button>
          <button onClick={fastForward} aria-label="Fast-forward past the rejections" title="F">skip</button>
          <button onClick={restart} aria-label="Restart the recovery" title="R">restart</button>
        </div>

        <label className="t-speed">
          <span className="label">speed</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={config.speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Sweep speed"
          />
        </label>

        <dl className="t-readout" aria-label="Live readout">
          <Readout k="block" v={`${view.currentBlock + 1}/${recovery.blocks.length}`} />
          <Readout k="byte" v={view.activeIndex == null ? '··' : String(view.activeIndex)} />
          <Readout
            k="guess"
            v={view.candidate == null ? '··' : hex(view.candidate)}
            tone="crafted"
          />
          <Readout k="found" v={`${done}/${totalBytes}`} tone="gold" />
          <Readout k="calls" v={callsAt.toLocaleString()} />
        </dl>

        <div className="t-group t-config">
          <button
            className={`only-wide ${config.cipher === 'toy' ? 'on' : ''}`}
            aria-pressed={config.cipher === 'toy'}
            onClick={() => setCipher(config.cipher === 'toy' ? 'aes' : 'toy')}
            title="The cipher is not the weakness"
          >
            {config.cipher === 'aes' ? 'AES-128' : 'toy cipher'}
          </button>
          <button
            className={`only-wide ${config.mac ? 'on sealed' : ''}`}
            aria-pressed={config.mac}
            onClick={() => setMac(!config.mac)}
          >
            MAC {config.mac ? 'on' : 'off'}
          </button>
          <button onClick={newSeed}>new message</button>
        </div>
      </div>
    </div>
  );
}

function Readout({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className={`readout ${tone ?? ''}`}>
      <dt className="label">{k}</dt>
      <dd className="readout-v mono">{v}</dd>
    </div>
  );
}
