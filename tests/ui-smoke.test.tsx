// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { App } from '../src/ui/App';

beforeEach(() => {
  // matchMedia is not in jsdom by default.
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe('the app mounts and renders the interrogation', () => {
  it('renders the title, the oracle lamp, and the stack without throwing', () => {
    const { getByText, container } = render(<App />);
    expect(getByText(/Oracle/)).toBeTruthy();
    // Query the panel heading itself. A loose /the oracle/i text match picks up
    // any prose mentioning the oracle, which is most of the app.
    expect(container.querySelector('.oracle-title')!.textContent).toMatch(/the oracle/i);
    // Four labelled rows and sixteen columns in each, all in one grid so the
    // byte columns cannot drift out of alignment (PRD §5.1, DESIGN.md §4.3).
    expect(container.querySelectorAll('.stack-grid .row-label').length).toBe(4);
    expect(container.querySelectorAll('.stack-grid .cell.crafted').length).toBe(16);
    expect(container.querySelectorAll('.stack-grid .cell.seen').length).toBe(16);
    expect(container.querySelectorAll('.stack-grid .cell.intermediate').length).toBe(16);
    expect(container.querySelectorAll('.stack-grid .cell.plain').length).toBe(16);
    // Nothing is judged before a question is asked: the seen row starts void.
    expect(container.querySelectorAll('.stack-grid .cell.seen.known').length).toBe(0);
  });

  it('single-stepping advances the oracle call counter', () => {
    const { container } = render(<App />);
    const stepBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'step',
    )!;
    expect(stepBtn).toBeTruthy();
    act(() => stepBtn.click());
    act(() => stepBtn.click());
    // The oracle panel shows a calls figure. It renders as an odometer: each
    // digit is a reel of 0-9 slid into place, all aria-hidden, so the value a
    // screen reader receives is the visually-hidden text beside them. Assert
    // that rather than an attribute, because it is what actually gets read.
    const calls = container.querySelector('.calls-figure')!;
    expect(calls.querySelector('.visually-hidden')!.textContent).toBe('2');
  });
});
