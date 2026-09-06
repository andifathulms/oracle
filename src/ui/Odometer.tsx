// A figure that rolls rather than jumps. Each digit is a column of 0–9 slid to
// position, so the counter reads as a mechanism counting up and never changes
// width as it spins (DESIGN.md §3.1, tabular figures).
import './odometer.css';

export function Odometer({ value, className }: { value: number; className?: string }) {
  const text = value.toLocaleString();
  return (
    <span className={`odo ${className ?? ''}`}>
      {/* The value as real text. It used to be aria-label on this span, but a
          span has no role, and aria-label on a generic element is not reliably
          exposed — several screen readers drop it. Every digit below is
          aria-hidden, so the counter could announce nothing at all. This is the
          project's existing visually-hidden helper rather than more ARIA. */}
      <span className="visually-hidden">{text}</span>
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
