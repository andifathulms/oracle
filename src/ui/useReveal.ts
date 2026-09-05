// Scenes arrive as they are reached rather than all at once, so the page reads
// as a sequence. One observer per scene, disconnected on first entry — nothing
// re-animates on the way back up, because a scene that keeps re-entering is
// noise rather than choreography.
//
// Under prefers-reduced-motion the hook reports revealed immediately: the
// theatre goes, the content stays (DESIGN.md §6.6).
import { useEffect, useRef, useState } from 'react';

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(
    () =>
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return { ref, shown };
}
