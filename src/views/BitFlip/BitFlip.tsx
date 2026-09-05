// Bit-flipping mode (PRD §4.3): the same CBC malleability, used as tampering
// rather than recovery. Pᵢ = Dₖ(Cᵢ) ⊕ Cᵢ₋₁, and the attacker controls Cᵢ₋₁ — so
// flipping a byte of the previous ciphertext block flips exactly that byte of
// the decrypted plaintext. No key, no recovery, no oracle.
import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { planBitFlip, stringToBytes } from '../../engine';
import { Section } from '../../ui/Section';
import { hex } from '../../ui/format';
import './bitflip.css';

const ORIGINAL = 'user=guest;x=0;';
// A synthetic previous ciphertext block. Nothing about it is secret — it is
// exactly the block an attacker would already hold.
const PREV = new Uint8Array(16).map((_, i) => (i * 37 + 11) & 0xff);

function pad16(s: string): Uint8Array {
  const out = new Uint8Array(16);
  const b = stringToBytes(s.slice(0, 16));
  out.set(b, 0);
  for (let i = b.length; i < 16; i++) out[i] = 0x20;
  return out;
}

export function BitFlip() {
  const { setMode } = useStore();
  const [desired, setDesired] = useState('user=admin;x=9;');

  const current = useMemo(() => pad16(ORIGINAL), []);
  const target = pad16(desired);
  const plan = useMemo(() => planBitFlip(current, target, PREV, 1), [current, target]);
  const changed = new Set(plan.deltas.map((d) => d.index));
  const tampered = new Uint8Array(16).map((_, i) => {
    const d = plan.deltas.find((x) => x.index === i);
    return d ? PREV[i] ^ d.xor : PREV[i];
  });

  return (
    <Section
      index="06"
      title="tampering: malleability without the key"
      lede="the padding oracle reads a message. the same property rewrites one. flipping a byte of the previous ciphertext block flips exactly that byte of the plaintext behind it."
      aside={<button onClick={() => setMode('recover')}>back to recovery</button>}
      wide
    >
      <div className="bitflip">
        <label className="bf-field">
          <span className="label">what the attacker wants the server to read (16 characters)</span>
          <input
            className="mono"
            value={desired}
            maxLength={16}
            spellCheck={false}
            onChange={(e) => setDesired(e.target.value)}
          />
        </label>

        <div className="bf-grid">
          <CharRow label="what it says now" tone="plain" bytes={current} />
          <CharRow label="what it should say" tone="want" bytes={target} mark={changed} />
          <DeltaRow label="Cᵢ₋₁ before" bytes={PREV} />
          <DeltaRow label="Cᵢ₋₁ after" bytes={tampered} mark={changed} tone="crafted" />
          <div className="bf-row xor-row">
            <span className="bf-label label">the flip</span>
            <div className="bf-cells">
              {Array.from({ length: 16 }, (_, i) => {
                const d = plan.deltas.find((x) => x.index === i);
                return (
                  <span key={i} className={`bf-cell delta ${d ? 'on' : ''}`}>
                    {d ? `⊕${hex(d.xor)}` : '··'}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="bf-row addr-row" aria-hidden="true">
            <span className="bf-label" />
            <div className="bf-cells">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className={`bf-addr ${changed.has(i) ? 'on' : ''}`}>{i}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bf-result">
          <span className={`bf-count ${plan.deltas.length ? 'on' : ''}`}>
            {plan.deltas.length}
          </span>
          <p className="bf-copy">
            {plan.deltas.length === 0
              ? 'nothing to change. the message already reads that way.'
              : `${plan.deltas.length} byte${plan.deltas.length === 1 ? '' : 's'} of the previous ciphertext block, exclusive-or'd. the server decrypts the new message with the same key it always had, and nothing in the ciphertext looks wrong to it.`}
          </p>
        </div>

        <p className="bf-caveat">
          this is why a padding oracle is not the only cost of an unauthenticated
          ciphertext. a MAC over the ciphertext stops this the same way it stops the
          oracle: the tag no longer matches, and the message is rejected before it is
          decrypted.
        </p>
      </div>
    </Section>
  );
}

function CharRow({
  label, bytes, mark, tone,
}: { label: string; bytes: Uint8Array; mark?: Set<number>; tone: string }) {
  return (
    <div className="bf-row">
      <span className="bf-label label">{label}</span>
      <div className="bf-cells">
        {Array.from(bytes).map((c, i) => (
          <span key={i} className={`bf-cell char ${tone} ${mark?.has(i) ? 'changed' : ''}`}>
            {c >= 0x20 && c <= 0x7e ? String.fromCharCode(c) : '·'}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeltaRow({
  label, bytes, mark, tone,
}: { label: string; bytes: Uint8Array; mark?: Set<number>; tone?: string }) {
  return (
    <div className="bf-row">
      <span className="bf-label label">{label}</span>
      <div className="bf-cells">
        {Array.from(bytes).map((c, i) => (
          <span key={i} className={`bf-cell hexb ${tone ?? ''} ${mark?.has(i) ? 'changed' : ''}`}>
            {hex(c)}
          </span>
        ))}
      </div>
    </div>
  );
}
