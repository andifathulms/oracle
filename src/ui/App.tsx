import { useEffect } from 'react';
import { StoreProvider, useStore } from '../state/store';
import { Stack } from '../views/Stack/Stack';
import { OraclePanel } from '../views/Oracle/OraclePanel';
import { XorResolve } from '../views/XorResolve/XorResolve';
import { Message } from '../views/Message/Message';
import { CipherPanel } from '../views/CipherPanel/CipherPanel';
import { BitFlip } from '../views/BitFlip/BitFlip';
import { Section } from './Section';
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
  const { config, setMode, toggle, step, fastForward, restart } = useStore();

  // Keyboard: space toggles the sweep, arrows step, F fast-forwards, R restarts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fastForward(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, step, fastForward, restart]);

  const bitflip = config.mode === 'bitflip';

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <Mark />
            <div className="brand-text">
              <span className="brand-name">Oracle</span>
              <span className="brand-sub">recover a message from one bit of feedback</span>
            </div>
          </div>

          <nav className="modes" role="tablist" aria-label="Mode">
            <button
              role="tab"
              aria-selected={!bitflip}
              className={!bitflip ? 'on' : ''}
              onClick={() => setMode('recover')}
            >
              recovery
            </button>
            <button
              role="tab"
              aria-selected={bitflip}
              className={bitflip ? 'on' : ''}
              onClick={() => setMode('bitflip')}
            >
              tampering
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
          <Section
            index="01"
            title="the interrogation"
            lede="the attacker holds only the ciphertext. every question is one crafted block; every answer is one bit. the intermediate row fills from the right as bytes are recovered."
            wide
          >
            <div className="interrogation">
              <div className="workspace">
                <Stack />
                <DisambiguationBar />
              </div>
              <OraclePanel />
            </div>
          </Section>

          <Section
            index="02"
            title="the resolution"
            lede="two exclusive-ors turn an accepted guess into a byte of plaintext. nothing here uses the key."
          >
            <XorResolve />
          </Section>

          <Section
            index="03"
            title="the message"
            lede="the plaintext accumulating, and the price in oracle calls."
          >
            <Message />
          </Section>

          <Section
            index="04"
            title="the defences"
            lede="one of these changes nothing about the attack. the other closes it completely."
          >
            <div className="defences">
              <CipherPanel />
            </div>
          </Section>

          <Section index="05" title="the record" lede="every recovered byte, as a table and as hex.">
            <HexExport />
          </Section>
        </main>
      )}

      {!bitflip ? <Transport /> : null}

      <footer className="colophon">
        <span>
          seed <code>{config.seed}</code>
        </span>
        <span className="colophon-dot" aria-hidden="true">·</span>
        <span>everything is synthetic and stays on this device — the app has no network code at all.</span>
      </footer>
    </div>
  );
}

// The mark: a void cell resolving to gold. The app in one glyph.
function Mark() {
  return (
    <svg className="mark" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect x="1" y="1" width="28" height="28" rx="4" fill="var(--void)" stroke="var(--rule-strong)" />
      <rect x="6.5" y="6.5" width="7" height="7" rx="1.5" fill="var(--crafted)" opacity="0.85" />
      <rect x="16.5" y="6.5" width="7" height="7" rx="1.5" fill="var(--ink-ghost)" opacity="0.5" />
      <rect x="6.5" y="16.5" width="7" height="7" rx="1.5" fill="var(--ink-ghost)" opacity="0.5" />
      <rect x="16.5" y="16.5" width="7" height="7" rx="1.5" fill="var(--recovered)">
        <animate
          attributeName="opacity"
          values="0.25;1;0.25"
          dur="4.5s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}
