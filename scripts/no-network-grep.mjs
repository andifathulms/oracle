// Fail if the built bundle contains any network API (PRD §7.1, CLAUDE.md §2).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = ['fetch', 'XMLHttpRequest', 'WebSocket', 'sendBeacon'];
const dist = 'dist';

function files(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...files(full));
    else if (/\.(js|mjs|cjs|html|wasm)$/.test(e.name)) out.push(full);
  }
  return out;
}

let failed = false;
const all = files(dist);
for (const token of FORBIDDEN) {
  const re = new RegExp(`\\b${token}\\b`);
  for (const f of all) {
    if (re.test(readFileSync(f, 'utf8'))) {
      console.error(`FAIL: "${token}" found in ${f}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log(`no-network grep clean across ${all.length} bundle files`);
