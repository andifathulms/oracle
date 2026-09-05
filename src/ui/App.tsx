import { useEffect } from 'react';
import { StoreProvider, useStore } from '../state/store';
import { Stack } from '../views/Stack/Stack';
import { OraclePanel } from '../views/Oracle/OraclePanel';
import { XorResolve } from '../views/XorResolve/XorResolve';
import { Message } from '../views/Message/Message';
import { CipherPanel } from '../views/CipherPanel/CipherPanel';
import { BitFlip } from '../views/BitFlip/BitFlip';
import { Controls } from './Controls';
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
  const { config, toggle, step, fastForward } = useStore();

  // Keyboard: space toggles the sweep, arrow-right single-steps, F fast-forwards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fastForward(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, step, fastForward]);

  return (
    <div className="shell">
      <header className="shell-header">
        <h1 className="shell-title">
          Oracle <span className="shell-sub">· recover a message from a single bit of feedback</span>
        </h1>
      </header>

      {config.mode === 'bitflip' ? (
        <main className="shell-main">
          <BitFlip />
        </main>
      ) : (
        <main className="shell-main">
          <div className="shell-hero">
            <div className="shell-left">
              <Stack />
              <DisambiguationBar />
              <XorResolve />
            </div>
            <OraclePanel />
          </div>

          <Message />

          <div className="shell-panels">
            <CipherPanel />
          </div>

          <Controls />
          <HexExport />
        </main>
      )}

      <footer className="shell-footer">
        <span>
          seed <code>{config.seed}</code> · everything is synthetic and stays on
          this device — the app has no network code at all.
        </span>
      </footer>
    </div>
  );
}
