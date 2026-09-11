// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { App } from '../src/ui/App';

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

// Guards the parts that are easy to break silently: every outbound link keeps
// rel="noopener noreferrer", every icon link keeps its platform name, and the
// year is computed rather than typed.
describe('maker signature', () => {
  it('is in the shared footer, labelled, and safe', () => {
    const { container } = render(<App />);
    const maker = container.querySelector('footer.colophon .maker')!;
    expect(maker).toBeTruthy();

    // Separate from the app's data notice, not merged into it.
    expect(container.querySelector('footer.colophon .colophon-notice')).toBeTruthy();

    const links = Array.from(maker.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.length).toBe(5); // name + 4 icons

    for (const a of links) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toBe('noopener noreferrer');
      expect(a.href).toMatch(/^https:\/\//);
    }

    const icons = Array.from(maker.querySelectorAll('.maker-icon')) as HTMLAnchorElement[];
    expect(icons.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Portfolio', 'GitHub', 'LinkedIn', 'Instagram',
    ]);
    for (const a of icons) expect(a.querySelector('svg')).toBeTruthy();

    // Year computed, not hardcoded.
    expect(maker.querySelector('.maker-year')!.textContent)
      .toBe(`© ${new Date().getFullYear()}`);

    // The name links to the portfolio and has no redundant aria-label.
    const name = maker.querySelector('.maker-name') as HTMLAnchorElement;
    expect(name.href).toBe('https://andifathulms.github.io/en/');
    expect(name.getAttribute('aria-label')).toBeNull();

    console.log('COLOPHON:', container.querySelector('footer.colophon')!.textContent!.replace(/\s+/g, ' '));
    console.log('MAKER   :', maker.textContent!.replace(/\s+/g, ' '));
  });
});
