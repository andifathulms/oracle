// A figure that rolls rather than jumps. Each digit is a column of 0–9 slid to
// position, so the counter reads as a mechanism counting up and never changes
// width as it spins (DESIGN.md §3.1, tabular figures).
import './odometer.css';

export function Odometer({ value, className }: { value: number; className?: string }) {
  const text = value.toLocaleString();
  return (
    <span className={`odo ${className ?? ''}`} aria-label={String(value)}>
      {text.split('').map((ch, i) => {
        const digit = Number(ch);
        if (Number.isNaN(digit)) {
          return (
            <span key={i} className="odo-sep" aria-hidden="true">
              {ch}
            </span>
          );
        }
        return (
          <span key={i} className="odo-slot" aria-hidden="true">
            <span className="odo-reel" style={{ transform: `translateY(${-digit * 10}%)` }}>
              {'0123456789'.split('').map((d) => (
                <span key={d} className="odo-digit">{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
