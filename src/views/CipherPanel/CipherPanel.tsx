// The cipher panel (DESIGN.md §5.6, PRD §6.3): the block cipher as a labelled
// box in the CBC chain, with the AES/toy toggle beside it.
//
// The claim — that the cipher is not the weakness — is stated once, and then
// evidenced: both ciphers are run against the same message and both call
// counts are shown. They differ only by where the sweeps happened to hit.
import { useMemo } from 'react';
import { buildTarget, recoverMessage } from '../../engine';
import { useStore } from '../../state/store';
import './cipher.css';

export function CipherPanel() {
  const { config, setCipher } = useStore();

  // Both ciphers, costed against the same message. Always without the MAC, so
  // the comparison is about the cipher and nothing else. The engine is pure and
  // a full recovery is milliseconds, so this only reruns on a seed change.
  const rows = useMemo(
    () =>
      (['aes', 'toy'] as const).map((kind) => ({
        kind,
        calls: recoverMessage(buildTarget({ seed: config.seed, cipher: kind, mac: false })).totalCalls,
      })),
    [config.seed],
  );
  const worst = Math.max(...rows.map((r) => r.calls));

  return (
    <section className="cipher panel" aria-label="Block cipher">
      <header className="cipher-head">
        <h3 className="cipher-title">the block cipher</h3>
        <div className="cipher-toggle" role="group" aria-label="Cipher choice">
          <button
            className={config.cipher === 'aes' ? 'on' : ''}
            aria-pressed={config.cipher === 'aes'}
            onClick={() => setCipher('aes')}
          >
            real AES
          </button>
          <button
            className={config.cipher === 'toy' ? 'on' : ''}
            aria-pressed={config.cipher === 'toy'}
            onClick={() => setCipher('toy')}
          >
            toy permutation
          </button>
        </div>
      </header>

      {/* The CBC chain, with the cipher as one swappable box inside it. */}
      <div className="chain" role="img" aria-label="CBC decryption chain">
        <Node label="Cᵢ" sub="ciphertext block" tone="crafted" />
        <Arrow />
        <div className={`chain-core ${config.cipher}`}>
          <span className="core-name">{config.cipher === 'aes' ? 'AES-128' : 'toy permutation'}</span>
          <span className="core-sub">Dₖ · the only place the key exists</span>
        </div>
        <Arrow />
        <Node label="Dₖ(Cᵢ)" sub="intermediate" tone="gold" />
        <span className="chain-op" aria-hidden="true">⊕</span>
        <Node label="Cᵢ₋₁" sub="previous block" tone="crafted" />
        <Arrow />
        <Node label="Pᵢ" sub="plaintext" tone="gold" />
      </div>

      <div className="cipher-evidence">
        {rows.map((r) => (
          <div key={r.kind} className={`ev-row ${r.kind === config.cipher ? 'on' : ''}`}>
            <span className="ev-name mono">{r.kind === 'aes' ? 'AES-128' : 'toy permutation'}</span>
            <span className="ev-bar" aria-hidden="true">
              <span
                className="ev-fill"
                style={{ width: `${(r.calls / worst) * 100}%` }}
              />
            </span>
            <span className="ev-calls mono">{r.calls.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <p className="cipher-point">
        the switch changes nothing about the attack. the same recovery, at the same cost. the two
        counts differ only in where the sweeps happened to hit. the cipher is not the weakness; the
        padding check is the hole.
      </p>
    </section>
  );
}

function Node({ label, sub, tone }: { label: string; sub: string; tone: string }) {
  return (
    <span className={`chain-node ${tone}`}>
      <span className="node-label">{label}</span>
      <span className="node-sub label">{sub}</span>
    </span>
  );
}

const Arrow = () => <span className="chain-arrow" aria-hidden="true" />;
