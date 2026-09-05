# Oracle

**Recover a message from a single bit of feedback.**

Oracle is an interactive demonstration of Vaudenay's padding oracle attack. You
are given a ciphertext and no key, and an oracle that answers exactly one thing
about any ciphertext you send it: whether its PKCS7 padding was valid. From that
one bit, repeated, the app recovers the entire plaintext — byte by byte, without
ever attacking the cipher.

The AES is never broken. The padding check is the entire hole.

## What it shows

- **The stack** — three aligned rows of byte-cells. The intermediate block
  starts as genuine void and fills with gold, right to left, as each byte is
  recovered from padding-valid answers alone.
- **The sweep** — the inner loop: a crafted byte cycling through candidates, the
  oracle answering one bit each time. 255 near-silent rejections, one accept.
- **The disambiguation** — the honest beat. On a last-byte hit the attack
  perturbs the second-to-last byte and re-queries, catching the false positive a
  plaintext ending in `0x02` would otherwise cause. Most visualisations skip it.
- **The cipher's irrelevance** — switch between real AES-128 and a toy
  permutation. The attack succeeds identically, at the same cost.
- **The silence** — turn on encrypt-then-MAC and the oracle answers the same to
  every question. The sweep starves; no gold ever appears.
- **Bit-flipping** — the same CBC malleability seen as tampering.

## Integrity

The view never receives the key or the plaintext. `src/engine/secret.ts` holds
them in a closure and exposes only an `AttackTarget` (ciphertext, IV, oracle,
call count). Everything on screen came from the attack, not from a value the app
already held — enforced by types and by test (`tests/view-blindness.test.ts`).

The app has **no network code at all**. A test greps the built bundle for
`fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` and fails on any hit.
Its inability to reach a real server is a property of the build.

## Develop

```bash
npm install
npm run dev        # Vite dev server
npm test           # Vitest: attack, disambiguation, MAC, no-network, blindness
npm run build      # typecheck + production build
```

The engine (`src/engine/`) is pure — no React, no DOM. The attack runs once, up
front, producing a trace; the UI replays it at the chosen speed, so scrubbing is
free.

## Deploy

GitHub Pages via Actions: typecheck → lint → test → no-network grep → build,
deploy only on green. Enable Pages (Settings → Pages → Source: GitHub Actions).

## Reference

- `PRD.md` — what and why; §2 is the exact mechanism.
- `DESIGN.md` — how it looks and moves.
- `CLAUDE.md` — build instructions.
