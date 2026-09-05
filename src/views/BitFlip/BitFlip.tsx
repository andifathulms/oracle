// Bit-flipping mode (PRD §4.3, §4.3): the same CBC malleability as tampering.
// The user edits a decrypted message they cannot encrypt — turning guest into
// admin — by flipping bytes in the previous block. No key involved.
import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { planBitFlip, stringToBytes, bytesToString } from '../../engine';
import { hex } from '../../ui/format';
import './bitflip.css';

// A self-contained demo target for tampering: a known plaintext block the user
// rewrites. This mirrors the CBC relation Pi = Dk(Ci) XOR Ci-1.
const ORIGINAL = 'user=guest;x=0;';
const PREV = new Uint8Array(16).map((_, i) => (i * 37 + 11) & 0xff); // synthetic C_{i-1}

function pad16(s: string): Uint8Array {
  const out = new Uint8Array(16);
  const b = stringToBytes(s.slice(0, 16));
  out.set(b, 0);
  for (let i = b.length; i < 16; i++) out[i] = 0x20; // space-fill for display
  return out;
}

export function BitFlip() {
  const { setMode } = useStore();
  const [desired, setDesired] = useState('user=admin;x=0;');

  const current = useMemo(() => pad16(ORIGINAL), []);
  const target = pad16(desired);
  const plan = useMemo(
    () => planBitFlip(current, target, PREV, 1),
    [current, target],
  );

  return (
    <section className="bitflip" aria-label="Bit-flipping mode">
      <div className="bitflip-head">
        <h2 className="bitflip-title">bit-flipping — malleability as tampering</h2>
        <button onClick={() => setMode('recover')}>back to recovery</button>
      </div>
      <p className="bitflip-copy">
        flipping a byte in the previous ciphertext block flips the same byte of
        the decrypted plaintext: Pᵢ = Dₖ(Cᵢ) ⊕ Cᵢ₋₁, and the attacker controls
        Cᵢ₋₁. rewrite the message; the deltas below are applied to the previous
        block without the key.
      </p>

      <label className="bitflip-field">
        <span>desired plaintext (16 chars)</span>
        <input
          className="mono"
          value={desired}
          maxLength={16}
          onChange={(e) => setDesired(e.target.value)}
        />
      </label>

      <div className="bitflip-rows">
        <Row label="original" chars={Array.from(current)} />
        <Row label="desired" chars={Array.from(target)} />
        <div className="bitflip-delta">
          <span className="row-label">Cᵢ₋₁ delta</span>
          <div className="delta-cells">
            {Array.from({ length: 16 }, (_, i) => {
              const d = plan.deltas.find((x) => x.index === i);
              return (
                <span key={i} className={`delta ${d ? 'on' : ''}`}>
                  {d ? `^${hex(d.xor)}` : '··'}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <p className="bitflip-result mono">
        result: <span className="ok">{bytesToString(target).trimEnd()}</span> —{' '}
        {plan.deltas.length} byte{plan.deltas.length === 1 ? '' : 's'} flipped in the
        previous block.
      </p>
    </section>
  );
}

function Row({ label, chars }: { label: string; chars: number[] }) {
  return (
    <div className="bitflip-row">
      <span className="row-label">{label}</span>
      <div className="delta-cells">
        {chars.map((c, i) => (
          <span key={i} className="charcell">
            {c >= 0x20 && c <= 0x7e ? String.fromCharCode(c) : '·'}
          </span>
        ))}
      </div>
    </div>
  );
}
