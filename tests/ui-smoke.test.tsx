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
    // Three stack rows exist.
    expect(container.querySelectorAll('.stack-row').length).toBe(3);
    // 16 crafted cells.
    expect(container.querySelectorAll('.row-cells .cell.crafted').length).toBe(16);
  });

  it('single-stepping advances the oracle call counter', () => {
    const { container } = render(<App />);
    const stepBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'step',
    )!;
    expect(stepBtn).toBeTruthy();
    act(() => stepBtn.click());
    act(() => stepBtn.click());
    // The oracle panel shows a calls figure; after two steps it should read 2.
    const calls = container.querySelector('.calls-figure')!;
    expect(calls.textContent).toBe('2');
  });
});
