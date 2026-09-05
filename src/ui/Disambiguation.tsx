// The honest beat, made legible (DESIGN.md §5.3). When the last-byte sweep
// hits, the interface does not commit. It perturbs byte 14, re-queries, and
// shows both the probe and the verdict. Most visualisations skip this; catching
// a real false positive is the app at its most honest, so it gets room.
import { useStore } from '../state/store';
import { hex } from './format';
import './disambiguation.css';

export function DisambiguationBar() {
  const { view, timeline, index } = useStore();

  // False positives caught *so far* — evidence the check is not decorative.
  // Deliberately counted over the replayed events only, not over the whole
  // precomputed trace: the interface must never show a fact the attack has
  // not yet reached, or it looks like it knew the answer all along.
  let caught = 0;
  for (let i = 0; i <= index && i < timeline.events.length; i++) {
    const ev = timeline.events[i];
    if (ev.kind === 'disambiguate' && !ev.stillValid) caught++;
  }

  if (!view.disambiguating) {
    return (
      <div className="disambig idle" aria-hidden="true">
        <span className="disambig-dot" />
        <span className="disambig-term">disambiguation</span>
        <span className="disambig-detail">
          The last byte double-checks itself before committing: a genuine 0x01, or a longer pad
          in disguise.
        </span>
        <span className="disambig-count label">
          {caught === 0 ? 'None caught yet' : `${caught} caught so far`}
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
          ? 'Byte 14 was perturbed and the padding still held. A genuine 0x01, so the byte commits.'
          : 'Byte 14 was perturbed and the padding broke. The hit was a longer pad, so the sweep resumes.'}
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
