// A scene: numbered rule, title, and one line of orientation. The number is
// the spine of the reading order — the app is a sequence, not a dashboard.
import type { ReactNode } from 'react';
import './section.css';

export function Section({
  index,
  title,
  lede,
  aside,
  wide,
  children,
}: {
  index: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`scene ${wide ? 'wide' : ''}`} aria-label={title}>
      <div className="scene-head">
        <span className="scene-index label">{index}</span>
        <div className="scene-titles">
          <h2 className="scene-title">{title}</h2>
          {lede ? <p className="scene-lede">{lede}</p> : null}
        </div>
        {aside ? <div className="scene-aside">{aside}</div> : null}
      </div>
      <div className="scene-body">{children}</div>
    </section>
  );
}
