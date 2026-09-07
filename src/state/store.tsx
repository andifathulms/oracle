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
  rapid: boolean;
  setSeed: (seed: string) => void;
  setCipher: (c: CipherKind) => void;
  setMac: (on: boolean) => void;
  setDisambiguate: (on: boolean) => void;
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

// The lamp goes bright green once per accepted byte and sits dim for the ~128
// rejections in between, so its flash rate is steps/s divided by roughly 128.
// WCAG 2.3.1 puts the threshold at three flashes per second, which this crosses
// at about 384 steps/s — inside the top of the scrubber's range.
//
// The lamp is a 120x84 area, small enough that it probably falls under 2.3.1's
// small-safe-area exemption on its own. Probably is not a word to ship a
// photosensitivity risk on, and the calculation depends on viewing distance and
// on what else is repainting alongside it.
const FLASH_SAFE_STEPS_PER_SECOND = 3 * 128;

// Under reduced motion the loop advances between meaningful events rather than
// through every rejection, so this is events per second, not steps: slow enough
// to read each state as it lands.
const REDUCED_EVENTS_PER_SECOND = 2;

export function isRapid(speed: number, playing: boolean): boolean {
  return playing && stepsPerSecond(speed) > FLASH_SAFE_STEPS_PER_SECOND;
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
    const r = recoverMessage(t, config.disambiguate);
    const tl = buildTimeline(r);
    return { target: t, recovery: r, timeline: tl };
  }, [config.seed, config.cipher, config.mac, config.disambiguate]);

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
      // Under prefers-reduced-motion the sweep does not cycle. DESIGN.md §6.6:
      // "the sweep becomes a stepper with no cycling animation — each step is
      // an instant state." Playback advances between meaningful events instead
      // of animating through 255 rejections, at a fixed readable cadence that
      // ignores the speed scrubber. That is the same collapse the fast-forward
      // button performs, which DESIGN.md §6 already defines as keeping the
      // disambiguation and the resolution while dropping the drudgery.
      //
      // reducedMotion was computed and passed to two components for entrance
      // effects, but the loop that drives all of the app's motion never
      // consulted it.
      acc.current += dt * (reducedMotion ? REDUCED_EVENTS_PER_SECOND : stepsPerSecond(config.speed));
      if (acc.current >= 1) {
        const advance = Math.floor(acc.current);
        acc.current -= advance;
        setIndex((i) => {
          let next = i;
          if (reducedMotion) {
            for (let n = 0; n < advance; n++) next = collapseSweep(timeline, next);
          } else {
            next = Math.min(i + advance, timeline.events.length - 1);
          }
          if (next >= timeline.events.length - 1) setPlaying(false);
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, config.speed, timeline, reducedMotion]);

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
    rapid: isRapid(config.speed, playing),
    setSeed: (seed) => patch({ seed }),
    setCipher: (cipher) => patch({ cipher }),
    setMac: (mac) => patch({ mac }),
    setDisambiguate: (disambiguate) => patch({ disambiguate }),
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
