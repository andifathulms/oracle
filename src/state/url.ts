// Seed, cipher, MAC, speed, and mode serialise to the URL so a specific
// message and its recovery are reproducible and shareable (CLAUDE.md §7).
// There is no user secret — the whole message is synthetic — so sharing is safe.
import type { CipherKind } from '../engine';

export type Mode = 'recover' | 'bitflip';

export interface SessionConfig {
  seed: string;
  cipher: CipherKind;
  mac: boolean;
  speed: number; // 0..1 continuous scrubber
  mode: Mode;
}

export const DEFAULT_CONFIG: SessionConfig = {
  seed: 'oracle',
  cipher: 'aes',
  mac: false,
  speed: 0.35,
  mode: 'recover',
};

export function readConfig(): SessionConfig {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const cfg = { ...DEFAULT_CONFIG };
  if (params.has('seed')) cfg.seed = params.get('seed')!;
  const cipher = params.get('cipher');
  if (cipher === 'aes' || cipher === 'toy') cfg.cipher = cipher;
  if (params.get('mac') === '1') cfg.mac = true;
  const speed = Number(params.get('speed'));
  if (!Number.isNaN(speed) && speed >= 0 && speed <= 1) cfg.speed = speed;
  const mode = params.get('mode');
  if (mode === 'recover' || mode === 'bitflip') cfg.mode = mode;
  return cfg;
}

export function writeConfig(cfg: SessionConfig): void {
  const params = new URLSearchParams();
  params.set('seed', cfg.seed);
  params.set('cipher', cfg.cipher);
  params.set('mac', cfg.mac ? '1' : '0');
  params.set('speed', cfg.speed.toFixed(2));
  params.set('mode', cfg.mode);
  const next = '#' + params.toString();
  if (next !== window.location.hash) {
    history.replaceState(null, '', next);
  }
}
