// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { App } from '../src/ui/App';
import { buildTarget } from '../src/engine/secret';
import { recoverMessage } from '../src/engine/attack/message';

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

// The worked example states arithmetic in prose. Prose does not typecheck, so
// this asserts the claims it makes still hold against the engine, and that
// every number it quotes is really on screen before any control is touched.
describe('worked example', () => {
  it('states arithmetic that actually holds', () => {
    const t = buildTarget({ seed: 'oracle', cipher: 'aes', mac: false });
    const r = recoverMessage(t);
    const b = r.blocks[0].bytes[0];
    const crafted = b.intermediate ^ b.paddingTarget;
    // The two claims the example makes, checked against the engine.
    expect((crafted ^ b.paddingTarget) & 0xff).toBe(b.intermediate);
    expect((b.intermediate ^ t.iv[b.index]) & 0xff).toBe(b.plaintext);
    expect(b.index).toBe(15);
    expect(b.paddingTarget).toBe(1);

    const { container } = render(<App />);
    const worked = container.querySelector('.worked')!;
    expect(worked).toBeTruthy();
    const text = worked.textContent ?? '';
    const h = (n: number) => n.toString(16).padStart(2, '0');
    // Every number the prose asserts must appear.
    for (const v of [h(crafted), h(b.paddingTarget), h(b.intermediate), h(t.iv[b.index]), h(b.plaintext)]) {
      expect(text).toContain(v);
    }
    console.log('worked example renders on load, no interaction:', text.slice(0, 120).replace(/\s+/g, ' '));
  });
});
