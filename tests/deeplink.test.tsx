// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { App } from '../src/ui/App';

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); window.location.hash = ''; });

// A shared trace position must survive the reset-on-new-trace effect, and a
// position captured against a different config must land somewhere valid
// rather than throwing. Both are easy to break without noticing.
describe('deep link to a moment in the trace', () => {
  it('restores a shared moment, and clamps a stale one', () => {
    window.location.hash = '#seed=oracle&cipher=aes&mac=0&speed=0.35&mode=recover&t=500';
    const a = render(<App />);
    const found = a.container.querySelectorAll('.cell.intermediate.known').length;
    expect(found).toBeGreaterThan(0);     // did not reset to the start
    cleanup();

    // A position past the end of the trace must land valid, not throw.
    window.location.hash = '#seed=oracle&cipher=aes&mac=0&speed=0.35&mode=recover&t=99999999';
    const b = render(<App />);
    expect(b.container.querySelector('.stack')).toBeTruthy();
    cleanup();

    // No t at all: the app starts at the beginning, as before.
    window.location.hash = '#seed=oracle&cipher=aes&mac=0&speed=0.35&mode=recover';
    const c = render(<App />);
    expect(c.container.querySelectorAll('.cell.intermediate.known').length).toBe(0);

    // The link button stamps t into the hash.
    const btn = c.container.querySelector('button[aria-label="Link to this moment in the recovery"]') as HTMLButtonElement;
    act(() => btn.click());
    expect(window.location.hash).toMatch(/[?&#]t=-?\d+/);
  });
});
