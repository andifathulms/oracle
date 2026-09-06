// The session store: config (URL-synced), the built target + recovery + timeline
// (recomputed from config), and the rAF replay engine (CLAUDE.md §5, §6).
//
// The attack runs once, up front, producing the trace. The UI replays the flat
// timeline at the user's chosen rate; pacing is decoupled from computation so
// scrubbing is free.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { buildTarget, recoverMessage, type AttackTarget, type MessageRecovery } from '../engine';
import { buildTimeline, selectView, collapseSweep, type Timeline, type ViewState } from './timeline';
import {
  DEFAULT_CONFIG, readConfig, writeConfig, readMoment, writeMoment,
  type SessionConfig, type Mode,
} from './url';
import type { CipherKind } from '../engine';

interface Store {
  config: SessionConfig;
  target: AttackTarget;
  recovery: MessageRecovery;
  timeline: Timeline;
  view: ViewState;
  playing: boolean;
  index: number; // current timeline position (-1 = before start)
  callsAt: number; // oracle calls represented up to the current index
  reducedMotion: boolean;
  setSeed: (seed: string) => void;
  setCipher: (c: CipherKind) => void;
  setMac: (on: boolean) => void;
  setSpeed: (s: number) => void;
  setMode: (m: Mode) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  step: () => void;
  fastForward: () => void;
  restart: () => void;
  seekBlock: (blockIndex: number) => void;
  seek: (index: number) => void;
  newSeed: () => void;
  linkToMoment: () => string;
}

const StoreContext = createContext<Store | null>(null);

// Map the 0..1 speed scrubber to sweep steps per second. Continuous control →
// direct mapping, zero easing (DESIGN.md §6.1). Low end ~ single readable
// steps; high end fast-forward territory.
function stepsPerSecond(speed: number): number {
  // 2 steps/s at 0, up to ~600/s near 1 — exponential feels linear to the eye.
  return 2 * Math.pow(300, speed);
}

// Count oracle calls represented by timeline events up to `index`. Sweeps and
// disambiguations each cost one call; commits cost none.
function callsUpTo(timeline: Timeline, index: number): number {
  let n = 0;
  for (let i = 0; i <= index && i < timeline.events.length; i++) {
    const ev = timeline.events[i];
    if (ev.kind === 'sweep' || ev.kind === 'disambiguate') n++;
  }
  return n;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SessionConfig>(() =>
    typeof window === 'undefined' ? DEFAULT_CONFIG : readConfig(),
  );
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);

  // A moment deep-linked in the URL (B2). Held in a ref because it must be
  // consumed exactly once: the reset-on-new-trace effect below runs on first
  // mount too, and would otherwise stamp the shared position back to -1.
  const pendingMoment = useRef<number | null>(
    typeof window === 'undefined' ? null : readMoment(),
  );

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Build the target + recovery + timeline whenever the sealed inputs change.
  // Speed and mode do not rebuild the attack.
  const { target, recovery, timeline } = useMemo(() => {
    const t = buildTarget({ seed: config.seed, cipher: config.cipher, mac: config.mac });
    const r = recoverMessage(t);
    const tl = buildTimeline(r);
    return { target: t, recovery: r, timeline: tl };
  }, [config.seed, config.cipher, config.mac]);

  // Reset playback when the trace changes, unless a shared moment is waiting.
  // The link's index is clamped to the trace actually built: a link made
  // against a different seed or cipher lands somewhere valid rather than
  // throwing, which is the honest failure mode for a position that only means
  // anything next to the config it was captured with.
  useEffect(() => {
    const pending = pendingMoment.current;
    pendingMoment.current = null;
    const last = timeline.events.length - 1;
    setIndex(pending == null ? -1 : Math.min(Math.max(pending, -1), last));
    setPlaying(false);
  }, [timeline]);

  // Persist config to the URL.
  useEffect(() => {
    writeConfig(config);
  }, [config]);

  // rAF replay loop.
  const acc = useRef(0);
  const lastT = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      lastT.current = null;
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      if (lastT.current == null) lastT.current = t;
      const dt = (t - lastT.current) / 1000;
      lastT.current = t;
      acc.current += dt * stepsPerSecond(config.speed);
      if (acc.current >= 1) {
        const advance = Math.floor(acc.current);
        acc.current -= advance;
        setIndex((i) => {
          const next = Math.min(i + advance, timeline.events.length - 1);
          if (next >= timeline.events.length - 1) setPlaying(false);
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, config.speed, timeline]);

  const view = useMemo(() => selectView(timeline, index), [timeline, index]);
  const callsAt = useMemo(() => callsUpTo(timeline, index), [timeline, index]);

  const play = useCallback(() => {
    setIndex((i) => (i >= timeline.events.length - 1 ? -1 : i));
    setPlaying(true);
  }, [timeline]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const step = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(i + 1, timeline.events.length - 1));
  }, [timeline]);
  const fastForward = useCallback(() => {
    setPlaying(false);
    setIndex((i) => collapseSweep(timeline, i));
  }, [timeline]);
  const restart = useCallback(() => {
    setPlaying(false);
    setIndex(-1);
  }, []);
  const seekBlock = useCallback(
    (blockIndex: number) => {
      setPlaying(false);
      const start = timeline.blockStart[blockIndex];
      if (start != null) setIndex(start);
    },
    [timeline],
  );

  // Scrubbing the whole trace is free — the recovery already exists.
  // Stamp the current position into the URL and hand back the resulting link.
  // Writing happens here and nowhere else, so scrubbing stays free of history
  // churn (CLAUDE.md §5: the trace already exists, scrubbing must cost nothing).
  const linkToMoment = useCallback(() => writeMoment(index), [index]);

  const seek = useCallback(
    (i: number) => {
      setPlaying(false);
      setIndex(Math.max(-1, Math.min(i, timeline.events.length - 1)));
    },
    [timeline],
  );

  const patch = useCallback((p: Partial<SessionConfig>) => setConfig((c) => ({ ...c, ...p })), []);

  const store: Store = {
    config,
    target,
    recovery,
    timeline,
    view,
    playing,
    index,
    callsAt,
    reducedMotion,
    setSeed: (seed) => patch({ seed }),
    setCipher: (cipher) => patch({ cipher }),
    setMac: (mac) => patch({ mac }),
    setSpeed: (speed) => patch({ speed }),
    setMode: (mode) => patch({ mode }),
    play,
    pause,
    toggle,
    step,
    fastForward,
    restart,
    seekBlock,
    linkToMoment,
    seek,
    newSeed: () => patch({ seed: Math.random().toString(36).slice(2, 8) }),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used within StoreProvider');
  return s;
}
