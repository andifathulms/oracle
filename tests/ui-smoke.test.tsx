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
    expect(getByText(/the oracle/i)).toBeTruthy();
    // Three labelled rows and sixteen columns in each, all in one grid so the
    // byte columns cannot drift out of alignment.
    expect(container.querySelectorAll('.stack-grid .row-label').length).toBe(3);
    expect(container.querySelectorAll('.stack-grid .cell.crafted').length).toBe(16);
    expect(container.querySelectorAll('.stack-grid .cell.intermediate').length).toBe(16);
    expect(container.querySelectorAll('.stack-grid .cell.plain').length).toBe(16);
  });

  it('single-stepping advances the oracle call counter', () => {
    const { container } = render(<App />);
    const stepBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'step',
    )!;
    expect(stepBtn).toBeTruthy();
    act(() => stepBtn.click());
    act(() => stepBtn.click());
    // The oracle panel shows a calls figure. It renders as an odometer — each
    // digit is a reel of 0-9 slid into place — so the value is on the label
    // rather than in the text content.
    const calls = container.querySelector('.calls-figure')!;
    expect(calls.getAttribute('aria-label')).toBe('2');
  });
});
