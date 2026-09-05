// The honest beat, made legible (DESIGN.md §5.3). When the last-byte sweep hits,
// the interface double-checks by perturbing byte 14 before committing.
import { useStore } from '../state/store';
import './disambiguation.css';

export function DisambiguationBar() {
  const { view } = useStore();
  if (!view.disambiguating) {
    return (
      <div className="disambig placeholder" aria-hidden="true">
        <span className="disambig-term">disambiguation</span>
        <span className="disambig-detail">
          the last byte double-checks itself before committing — a genuine 0x01,
          or a longer pad in disguise.
        </span>
      </div>
    );
  }
  const genuine = view.disambiguationOutcome === 'genuine';
  return (
    <div className={`disambig active ${genuine ? 'genuine' : 'false'}`} role="status" aria-live="polite">
      <span className="disambig-term">disambiguation</span>
      <span className="disambig-detail">
        perturbed byte 14 and re-queried.{' '}
        {genuine
          ? 'still valid — a genuine 0x01. the byte commits.'
          : 'padding broke — the hit was a longer pad. the sweep resumes.'}
      </span>
    </div>
  );
}
