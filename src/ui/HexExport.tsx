// Keyboard-reachable table equivalent + hex export (DESIGN.md §8, PRD §9). The
// recovered intermediate and plaintext are copyable as hex; no download API is
// used (nothing leaves the device, no network).
import { useState } from 'react';
import { useStore } from '../state/store';
import { toHex } from '../engine';
import { printable } from './format';
import './hexexport.css';

export function HexExport() {
  const { view, recovery } = useStore();
  const [open, setOpen] = useState(false);

  const size = recovery.blockSize;
  const interBuf = new Map<number, number>();
  const plainBuf = new Map<number, number>();
  for (const b of view.recovered) {
    interBuf.set(b.blockIndex * size + b.index, b.intermediate);
    plainBuf.set(b.blockIndex * size + b.index, b.plaintext);
  }
  const n = recovery.plaintextPadded.length || 0;
  const inter = new Uint8Array(n);
  const plain = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    inter[i] = interBuf.get(i) ?? 0;
    plain[i] = plainBuf.get(i) ?? 0;
  }

  return (
    <section className="hexexport">
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'hide' : 'show'} recovered bytes (table + hex)
      </button>
      {open ? (
        <div className="hex-panel">
          <label className="hex-field">
            <span>recovered intermediate (hex)</span>
            <textarea readOnly value={toHex(inter)} rows={2} className="mono" />
          </label>
          <label className="hex-field">
            <span>recovered plaintext (hex)</span>
            <textarea readOnly value={toHex(plain)} rows={2} className="mono" />
          </label>
          <table className="hex-table">
            <caption className="visually-hidden">
              Recovered bytes, one row per recovered position
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">block</th>
                <th scope="col">byte</th>
                <th scope="col">intermediate</th>
                <th scope="col">plaintext</th>
                <th scope="col">char</th>
              </tr>
            </thead>
            <tbody>
              {view.recovered.map((b, i) => (
                <tr key={i}>
                  <td>{i}</td>
                  <td>{b.blockIndex}</td>
                  <td>{b.index}</td>
                  <td>{b.intermediate.toString(16).padStart(2, '0')}</td>
                  <td>{b.plaintext.toString(16).padStart(2, '0')}</td>
                  <td>{printable(b.plaintext)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
