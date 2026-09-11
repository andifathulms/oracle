import { useEffect } from 'react';
import { StoreProvider, useStore } from '../state/store';
import { Stack } from '../views/Stack/Stack';
import { OraclePanel } from '../views/Oracle/OraclePanel';
import { Channel } from '../views/Channel/Channel';
import { CandidateField } from '../views/Sweep/CandidateField';
import { XorResolve } from '../views/XorResolve/XorResolve';
import { Message } from '../views/Message/Message';
import { CipherPanel } from '../views/CipherPanel/CipherPanel';
import { Silence } from '../views/Silence/Silence';
import { BitFlip } from '../views/BitFlip/BitFlip';
import { Section } from './Section';
import { Announcer } from './Announcer';
import { SITE } from '../meta';
import { MakerSignature } from './MakerSignature';
import { Overture } from './Overture';
import { WorkedExample } from './WorkedExample';
import { Transport } from './Transport';
import { DisambiguationBar } from './Disambiguation';
import { HexExport } from './HexExport';
import './app.css';

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { config, setMode, toggle, step } = useStore();

  // Page-level keys: space toggles the sweep, right arrow steps.
  //
  // They fire only when nothing focusable holds focus. The old guard excluded
  // INPUT and TEXTAREA by tagName but not BUTTON, so Space on any of the app's
  // buttons was preventDefault()ed and played the sweep instead of pressing the
  // button under the cursor — every button in the app was Enter-only, and Space
  // did something unrelated (WCAG 2.1.1).
  //
  // The bare `f` and `r` shortcuts are gone. Single-character shortcuts have to
  // be disableable, remappable, or focus-scoped (WCAG 2.1.4), and speech input
  // fires them constantly by accident. Nothing is lost: skip and restart are
  // buttons in the transport, reachable by Tab like everything else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('button, input, textarea, select, a[href], [contenteditable], [tabindex]')) return;
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, step]);

  const bitflip = config.mode === 'bitflip';

  return (
    <div className="shell">
      <Announcer />
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <Mark />
            <div className="brand-text">
              <span className="brand-name">{SITE.name}</span>
              <span className="brand-sub">{SITE.tagline}</span>
            </div>
          </div>

          {/* Two mode switches, not ARIA tabs. They used to carry
              role=tablist and role=tab with no tabpanel, no aria-controls, no
              roving tabindex and no arrow-key handling, so they announced an
              interaction contract the app did not implement, and the arrow keys
              a tablist promises were being taken by the page shortcuts anyway
              (WCAG 4.1.2). role=tablist on the <nav> also suppressed its
              navigation landmark.

              Native buttons with aria-pressed say what these actually are:
              toggles that swap the view. No role is added; three are removed. */}
          <nav className="modes" aria-label="Mode">
            <button
              aria-pressed={!bitflip}
              className={!bitflip ? 'on' : ''}
              onClick={() => setMode('recover')}
            >
              Recovery
            </button>
            <button
              aria-pressed={bitflip}
              className={bitflip ? 'on' : ''}
              onClick={() => setMode('bitflip')}
            >
              Tampering
            </button>
          </nav>
        </div>
      </header>

      {bitflip ? (
        <main className="page">
          <BitFlip />
        </main>
      ) : (
        <main className="page">
          <Overture />

          <Section
            index="01"
            title="The interrogation"
            lede="The attacker holds only the ciphertext. Every question is one crafted block; every answer is one bit. The seen row is the padding the oracle judges; the intermediate row fills from the right as bytes are recovered."
            wide
          >
            <WorkedExample />

            <div className="interrogation">
              <div className="workspace">
                <Stack />
                <DisambiguationBar />
                <CandidateField />
              </div>
              <Channel />
              <OraclePanel />
            </div>
          </Section>

          <Section
            index="02"
            title="The resolution"
            lede="Two exclusive-ors turn an accepted guess into a byte of plaintext. Nothing here uses the key."
          >
            <XorResolve />
          </Section>

          <Section
            index="03"
            title="The message"
            lede="The plaintext accumulating, and the price in oracle calls."
          >
            <Message />
          </Section>

          <Section
            index="04"
            title="The defences"
            lede="One of these changes nothing about the attack. The other closes it completely."
          >
            <div className="defences">
              <CipherPanel />
              <Silence />
            </div>
          </Section>

          <Section index="05" title="The record" lede="Every recovered byte, as a table and as hex.">
            <HexExport />
          </Section>
        </main>
      )}

      {!bitflip ? <Transport /> : null}

      <footer className="colophon">
        {/* The app's own notice. Kept as one group so the maker's mark can sit
            opposite it without the two reading as a single line. */}
        <div className="colophon-notice">
          <span>
            seed <code>{config.seed}</code>
          </span>
          <span className="colophon-dot" aria-hidden="true">·</span>
          <span>Everything is synthetic and stays on this device. The app has no network code at all.</span>
        </div>

        <MakerSignature />
      </footer>
    </div>
  );
}

// The brand mark at its 32 tier: four cells, one of them recovered. Drawn from
// the same geometry as favicon.svg and the icon set, in the brand's own palette
// rather than the app's tokens, so the tab icon and the masthead are the same
// mark and not two near-misses.
//
// Two things went with the old placeholder. It pulsed the gold cell on an
// infinite SMIL <animate>, which the global prefers-reduced-motion block does
// not reach: that rule zeroes CSS animation and transition durations, and SMIL
// is neither. It was the only SMIL in the app and the only motion that survived
// the reduced-motion pass. And the brand brief is explicit that gold marks a
// byte the attacker has actually solved and is "never a brand flourish" — a
// pulsing gold cell is exactly the flourish it rules out.
function Mark() {
  return (
    <svg className="mark" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#0E1116" />
      <g transform="scale(0.32)">
        <rect x="12" y="20" width="32" height="26" fill="#5A6470" />
        <rect x="56" y="20" width="32" height="26" fill="#5A6470" />
        <rect x="12" y="54" width="32" height="26" fill="#5A6470" />
        <rect x="56" y="54" width="32" height="26" fill="#E3B448" />
      </g>
    </svg>
  );
}
