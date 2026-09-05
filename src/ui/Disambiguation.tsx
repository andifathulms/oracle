// The honest beat, made legible (DESIGN.md §5.3). When the last-byte sweep
// hits, the interface does not commit. It perturbs byte 14, re-queries, and
// shows both the probe and the verdict. Most visualisations skip this; catching
// a real false positive is the app at its most honest, so it gets room.
import { useStore } from '../state/store';
import { hex } from './format';
import './disambiguation.css';

export function DisambiguationBar() {
  const { view, recovery } = useStore();

  // How many false positives this recovery catches in total — evidence the
  // check is not decorative.
  const caught = recovery.blocks.reduce(
    (n, b) => n + b.disambiguations.filter((d) => !d.stillValid).length,
    0,
  );

  if (!view.disambiguating) {
    return (
      <div className="disambig idle" aria-hidden="true">
        <span className="disambig-dot" />
        <span className="disambig-term">disambiguation</span>
        <span className="disambig-detail">
          the last byte double-checks itself before committing — a genuine 0x01, or a longer pad
          in disguise.
        </span>
        <span className="disambig-count label">
          {caught} caught this run
        </span>
      </div>
    );
  }

  const genuine = view.disambiguationOutcome === 'genuine';
  const probe = view.craftedBlock;

  return (
    <div className={`disambig active ${genuine ? 'genuine' : 'false'}`} role="status" aria-live="polite">
      <span className="disambig-dot" />
      <span className="disambig-term">disambiguation</span>
      <span className="disambig-detail">
        {genuine
          ? 'byte 14 was perturbed and the padding still held. a genuine 0x01 — the byte commits.'
          : 'byte 14 was perturbed and the padding broke. the hit was a longer pad — the sweep resumes.'}
      </span>
      {probe ? (
        <span className="disambig-probe mono" aria-hidden="true">
          probe[14] = {hex(probe[14])}
        </span>
      ) : null}
      <span className={`disambig-verdict ${genuine ? 'yes' : 'no'}`}>
        {genuine ? 'genuine' : 'false positive'}
      </span>
    </div>
  );
}
