# CLAUDE.md — Oracle

Build instructions for Claude Code. PRD.md is what and why — and PRD §2 is the exact mechanism
the engine implements. DESIGN.md is how it looks.

## Non-negotiables

1. **The view cannot see the key or the original plaintext.** Enforced by types and by test
   (PRD §7.5). The recovered plaintext on screen must come from the attack, not from a value
   the app already held. This is the whole point; if it is violated the app is a magic trick.
2. **No network APIs in the bundle.** Not `fetch`, not `XMLHttpRequest`, not `WebSocket`, not
   `sendBeacon`. A test greps the built bundle and fails on any hit. The app's inability to
   attack a real server is a build property.
3. **The false-positive disambiguation is implemented and proven necessary.** PRD §3 and §7.2.
   A test asserts the naive path fails on a plaintext ending in `0x02`.
4. **The oracle returns one bit.** Its signature returns a boolean and nothing else — no error
   detail, no timing, no position. The attack must work from one bit because that is the truth
   of the attack.
5. **The engine is pure.** `src/engine/` imports nothing — no React, no DOM, no `Date`.
6. **Seeded randomness.** Key and IV generation use a seeded PRNG so a session is reproducible
   and shareable.

## Stack

- Vite + React 18 + TypeScript, strict.
- Plain CSS with custom properties.
- No crypto library for the attack logic — the CBC driver, PKCS7, and the attack are written
  here. The real AES block cipher is written here too (see §2); everything around
  it is ours.
- No charting library. Every view is byte-cells and XOR diagrams.
- Vitest.

## Layout

```
/
├─ src/
│  ├─ engine/
│  │  ├─ rng.ts
│  │  ├─ bytes.ts             # hex, xor, block helpers
│  │  ├─ aes.ts               # AES-128 and the toy permutation, behind one interface
│  │  ├─ cbc.ts               # encrypt / decrypt driver
│  │  ├─ pkcs7.ts             # pad / validate
│  │  ├─ mac.ts               # HMAC for encrypt-then-MAC
│  │  ├─ oracle.ts            # THE oracle: (ciphertext) => boolean
│  │  ├─ secret.ts            # holds key + plaintext; not exported to view — see §3
│  │  ├─ attack/
│  │  │  ├─ block.ts          # recover one block, with disambiguation
│  │  │  ├─ message.ts        # recover all blocks
│  │  │  ├─ bitflip.ts        # the tampering mode
│  │  │  └─ trace.ts          # every sweep step, every disambiguation, recorded
│  │  └─ index.ts             # exports the attack-facing surface ONLY
│  ├─ views/
│  │  ├─ Stack/               # the four-row hero
│  │  ├─ Sweep/
│  │  ├─ XorResolve/
│  │  ├─ Message/
│  │  ├─ CipherPanel/
│  │  ├─ Silence/             # the MAC / starved-oracle view
│  │  └─ BitFlip/
│  ├─ state/
│  ├─ ui/
│  └─ styles/
└─ tests/
   ├─ no-network.test.ts
   ├─ attack.test.ts
   ├─ disambiguation.test.ts
   ├─ view-blindness.test.ts
   ├─ cbc-pkcs7.test.ts
   └─ mac.test.ts
```

## 1. The oracle

```ts
// The ONLY channel between attacker and secret. Returns one bit.
type Oracle = (ciphertext: Uint8Array) => boolean;
```

Internally it decrypts with the real key, validates PKCS7 (or, with the MAC on, checks the MAC
first and returns false before decrypting), and returns whether padding was valid. It returns a
boolean. There is deliberately no richer return type, because a richer one would let the attack
cheat and would misrepresent the real-world signal.

The oracle counts its own calls. That counter is the only thing the attack learns beyond the
bit, and it is for the UI, not for the attack logic.

## 2. The block cipher

`aes.ts` exposes `encryptBlock` and `decryptBlock` over a 16-byte block, backed by:

- A real AES-128 written here in TypeScript, pinned by the FIPS-197 known-answer vector in a
  test. This started as "a small audited AES WASM, bundled not fetched", and the WASM never
  happened: a hand-written AES needs no binary to audit, no loader, and no exception to §2's
  no-network rule, and it costs about 7.5 KB of source. The rule that mattered — no crypto
  library for anything the attack touches — holds either way.
- A toy permutation for the toy mode — a fixed, seeded, reversible byte-shuffle-and-substitute.
  It must be a genuine bijection (`decryptBlock(encryptBlock(x)) === x`) or the CBC round-trip
  test fails.

The attack imports neither directly. It only ever calls the oracle. The cipher choice is a
property of how the oracle was constructed, which is exactly why switching it changes nothing
about the attack (PRD §6.3).

## 3. The secret boundary

This is the app's integrity mechanism and it mirrors Mind Reader's referee.

`secret.ts` constructs a key, a plaintext, an IV, and the resulting ciphertext, and exposes:

- the ciphertext (public — the attacker captured it)
- the IV (public — commonly is)
- an `Oracle` closure over the key

It does **not** export the key or the plaintext. They live in the closure. The attack receives
the ciphertext, the IV, and the oracle, and nothing else.

```ts
// index.ts exports only this shape to everything above the engine:
interface AttackTarget {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  oracle: Oracle;
  blockSize: 16;
  callCount: () => number;
}
```

`view-blindness.test.ts`:
- Type-level: `AttackTarget` has no `key` or `plaintext` field, and the view's props are
  derived from `AttackTarget` and the attack trace only.
- Runtime: build a target with a known plaintext held in the test's closure, run the attack,
  and assert the recovered bytes equal that plaintext — proving the screen can show the right
  answer without ever being handed it.

## 4. The attack

Implement exactly PRD §2 and §3. The trace is the point — the views render it and never
re-run the attack.

```ts
interface SweepStep {
  targetIndex: number;         // which byte of the block, 15 down to 0
  candidate: number;           // 0..255 being tried
  craftedBlock: Uint8Array;
  valid: boolean;              // the oracle's one bit
}

interface Disambiguation {
  targetIndex: 15;
  firstHit: number;            // the candidate that first returned valid
  perturbedProbe: Uint8Array;  // crafted block with byte 14 perturbed
  stillValid: boolean;         // true => genuine 0x01; false => was a longer pad
  resolvedCandidate: number;   // the candidate finally accepted
}

interface ByteRecovered {
  index: number;
  intermediate: number;        // Dk(C)[index]
  plaintext: number;           // intermediate ⊕ realPrevious[index]
  paddingTarget: number;       // the pad value forced this round
  oracleCalls: number;
}

interface BlockRecovery {
  blockIndex: number;
  sweeps: SweepStep[];
  disambiguations: Disambiguation[];
  bytes: ByteRecovered[];      // in recovery order: 15, 14, ... 0
  totalCalls: number;
}
```

`block.ts` recovers one block:

1. For the last byte, sweep 0..255, collecting `SweepStep`s until the oracle returns valid.
2. On the first hit, run the disambiguation (PRD §3): perturb byte 14, re-query. If still
   valid, accept; else resume the sweep from the next candidate. Record the `Disambiguation`.
3. Compute `intermediate[15]` and `plaintext[15]`.
4. For byte `i` from 14 down to 0: set the tail bytes so their `P_seen` equals the padding
   value `16 - i`, sweep byte `i` until valid, compute `intermediate[i]` and `plaintext[i]`.

The first block's "previous block" is the IV. Handle it identically — the IV is just `C₀`.

`message.ts` runs `block.ts` across every block after the first (a block is recovered using its
predecessor as the crafted-block base), and assembles the plaintext, stripping the final
block's padding.

## 5. Performance

A full block is ~2,000 oracle calls and each is one cheap decrypt. Recovering a block takes
milliseconds. The animation, not the computation, sets the pace.

Run the whole attack up front, produce the trace, and let the UI replay it at the user's chosen
speed. This keeps the engine pure and synchronous and makes scrubbing free — the trace already
exists. Do not drive the animation by running the attack in real time; that couples pacing to
computation and breaks scrubbing.

## 6. Animation

Hand-rolled, one rAF loop. The house rule, settled across eight apps:

**Continuous control → direct mapping, zero easing.** The speed scrubber and the manual
byte-editor map directly.

**Discrete control → timed transition.** Cipher switch, MAC toggle, mode switch, block
selection.

The sweep is a replay of `SweepStep[]` at the chosen rate. Single-step advances exactly one
step. Fast-forward collapses the sweep to its result while keeping the disambiguation and the
resolution visible, because those are the teaching and the raw 255 rejects are not.

## 7. State and URL

Seed serialises to the URL, so a specific message and its recovery are reproducible. Cipher
mode, MAC on/off, and speed serialise too. There is no user secret to protect here — the whole
message is synthetic and the point is to reveal it — so URL sharing is unconditionally safe.

A trace position serialises as `t`, deliberately outside `SessionConfig`: a config change
rebuilds the attack, and a playback position must never do that. It is written only when the
reader asks for a link, never during playback, so scrubbing stays free (§5). `t` means nothing
without the config beside it, so every read is clamped against the timeline actually built — a
link made against a different seed lands somewhere valid instead of throwing.

## 8. Copy

English, sentence case, no exclamation marks.

Precise crypto terms, defined once at first use: intermediate block, padding oracle,
malleability, encrypt-then-MAC. The attacker *recovers* the plaintext; the oracle *leaks* a
bit.

The cipher-irrelevance point (PRD §6.3) and the no-real-target point (PRD §6.4) each appear
once, plainly, at the place they arise — the cipher panel and near the oracle respectively.

The closing frame (the silence) needs one line and no more: the oracle now says the same thing
to every question, so there is nothing to learn from it.

## 9. Build order

Do not build the UI before step 4 passes.

1. Bytes, RNG, PKCS7, CBC driver, toy permutation. `cbc-pkcs7.test.ts`.
2. Real AES-128 written and pinned by the FIPS-197 known-answer test.
3. The oracle and the secret boundary. `view-blindness.test.ts` (as far as the engine side).
4. The attack with disambiguation. `attack.test.ts` and `disambiguation.test.ts`, including
   the assertion that the naive path fails on a `0x02`-terminated plaintext. **Gate.**
5. `no-network.test.ts` wired into CI. **Gate.**
6. Design tokens, shell, the four-row stack rendering a completed trace statically.
7. The sweep replay against the stack, with speed control. This is the hero; tune its pacing
   before building anything else — too fast and the mechanism is invisible, too slow and nobody
   watches a block finish.
8. The XOR resolution.
9. The message view with the request counter.
10. The cipher panel and the toy/real switch.
11. The silence: MAC on, starved oracle. `mac.test.ts`.
12. Bit-flipping mode.
13. Reduced motion, keyboard, hex export, mobile, Lighthouse.

## 10. Deployment

GitHub Pages via Actions. CI: typecheck → lint → test → no-network grep → build. Deploy only on
green.
