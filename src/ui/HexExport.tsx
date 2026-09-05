// Keyboard-reachable table equivalent + hex export (DESIGN.md §8, PRD §9). The
// recovered intermediate and plaintext are copyable as hex; no download API is
// used — nothing leaves the device, and the app has no network code at all.
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
      <button className="hex-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={`hex-caret ${open ? 'open' : ''}`} aria-hidden="true">▸</span>
        {open ? 'hide' : 'show'} the {view.recovered.length} recovered byte
        {view.recovered.length === 1 ? '' : 's'}
      </button>

      {open ? (
        <div className="hex-panel panel">
          <div className="hex-fields">
            <label className="hex-field">
              <span className="label">recovered intermediate (hex)</span>
              <textarea readOnly value={toHex(inter)} rows={2} className="mono" />
            </label>
            <label className="hex-field">
              <span className="label">recovered plaintext (hex)</span>
              <textarea readOnly value={toHex(plain)} rows={2} className="mono" />
            </label>
          </div>

          <div className="hex-table-wrap">
            <table className="hex-table">
              <caption className="visually-hidden">
                Recovered bytes, one row per recovered position
              </caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">block</th>
                  <th scope="col">byte</th>
                  <th scope="col">pad</th>
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
                    <td>{b.paddingTarget.toString(16).padStart(2, '0')}</td>
                    <td className="gold">{b.intermediate.toString(16).padStart(2, '0')}</td>
                    <td className="gold">{b.plaintext.toString(16).padStart(2, '0')}</td>
                    <td>{printable(b.plaintext)}</td>
                  </tr>
                ))}
                {view.recovered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="hex-empty">nothing recovered yet</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
