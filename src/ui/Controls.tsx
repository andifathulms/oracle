// The control bar (DESIGN.md §4.1 bottom row): sweep transport, the continuous
// speed scrubber (direct mapping, zero easing), the MAC toggle, and seed.
import { useStore } from '../state/store';
import './controls.css';

export function Controls() {
  const {
    playing, toggle, step, fastForward, restart,
    config, setSpeed, setMac, newSeed, setMode,
  } = useStore();

  return (
    <div className="controls" role="group" aria-label="Playback controls">
      <div className="controls-group">
        <button onClick={toggle} aria-label={playing ? 'Pause sweep' : 'Play sweep'}>
          {playing ? '❚❚ pause' : '▶ sweep'}
        </button>
        <button onClick={step} aria-label="Single step, one oracle call">
          step
        </button>
        <button onClick={fastForward} aria-label="Fast-forward, collapse the sweep">
          fast-forward
        </button>
        <button onClick={restart} aria-label="Restart">restart</button>
      </div>

      <label className="controls-speed">
        <span>speed</span>
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

      <div className="controls-group">
        <button
          className={config.mac ? 'on sealed' : ''}
          aria-pressed={config.mac}
          onClick={() => setMac(!config.mac)}
        >
          MAC: {config.mac ? 'on' : 'off'}
        </button>
        <button onClick={newSeed} aria-label="New random seed">new message</button>
        <button onClick={() => setMode('bitflip')}>bit-flip mode</button>
      </div>
    </div>
  );
}
