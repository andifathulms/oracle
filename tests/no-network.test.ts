import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// No network APIs in the bundle (PRD §7.1, CLAUDE.md §2). The app's inability
// to reach a real server is a property of the build, not a promise.
const FORBIDDEN = ['fetch', 'XMLHttpRequest', 'WebSocket', 'sendBeacon'];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(js|mjs|cjs|html|wasm)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('no network capability exists in the bundle', () => {
  const distDir = join(process.cwd(), 'dist');

  beforeAll(() => {
    execSync('npm run build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  }, 120000);

  it('dist was produced', () => {
    expect(existsSync(distDir)).toBe(true);
  });

  for (const token of FORBIDDEN) {
    it(`the built bundle contains no "${token}"`, () => {
      const files = collectFiles(distDir);
      expect(files.length).toBeGreaterThan(0);
      const hits: string[] = [];
      for (const f of files) {
        const text = readFileSync(f, 'utf8');
        // Match the identifier as a whole word (avoids matching substrings
        // like "prefetch" that are not the network API).
        const re = new RegExp(`\\b${token}\\b`);
        if (re.test(text)) hits.push(f);
      }
      expect(hits, `found "${token}" in: ${hits.join(', ')}`).toEqual([]);
    });
  }
});
