# DESIGN.md — Oracle

Visual and motion specification. PRD.md defines substance; this defines form.

---

## 0. The design problem

The app has to make a reader believe something that sounds false: that a message is being read
without its key, from a single bit of feedback, in front of them.

Belief is the whole design brief. If the interface looks like it might already know the answer,
the demonstration collapses into a magic trick, and the entire point — that this is real
cryptanalysis and not sleight of hand — is lost.

Two things build that belief, and the design serves them above all else:

**The unknown must look unknown.** The intermediate block starts as genuine void — not
placeholder zeros, not greyed digits, but cells that visibly contain nothing. When a byte
resolves, the reader must feel it arrive from outside the interface's prior knowledge. A cell
that fades from a faint value to a bold one implies the value was always there, faintly. A cell
that resolves from *nothing* implies it was discovered. The difference is the app.

**The one bit must be visibly one bit.** Every oracle call returns a single yes or no, and the
interface must never show more than that coming back. If the oracle panel leaks richer
feedback — a progress hint, a warmer/colder signal — the reader will suspect the attack is
using more than it claims. The oracle's reply is one lamp, on or off, and nothing else.

Everything below serves those two.

---

## 1. Design plan

**Concept: the interrogation.**

Two parties and a one-bit channel between them. On one side the attacker's workspace — the
crafted block, the sweep, the emerging plaintext. On the other, the oracle: a sealed box that
answers only yes or no. The channel between them is thin, and the drama is how much crosses it.

The register is instrument panel, not hacker terminal. No green-on-black, no falling glyphs, no
glitch type. This is a laboratory measuring a leak, and the leak is alarming precisely because
the apparatus is calm. A padding oracle attack rendered as cyberpunk would undersell it; the
truth is that it works against real, boring, correctly-built systems, and the design should feel
correct and boring in exactly that way.

**Alignment:** the four-row stack is the spine, and its bytes are the grid everything aligns
to. Byte columns run down through the crafted block, the intermediate block, and the plaintext,
so a single byte's story is a vertical read.

---

## 2. Colour

### 2.1 Ground

| Token | Value | Use |
|---|---|---|
| `--panel` | `#1A1E24` | Page. Cool dark slate — instrument, not terminal. |
| `--panel-raised` | `#232830` | Byte cells, the raised working surface. |
| `--void` | `#12151A` | Unknown bytes. Darker than the surface — a hole, not a cell. |
| `--ink` | `#E9EDF3` | Known byte values, primary text. 15.96:1. |
| `--ink-mid` | `#AAB4C2` | Labels, addresses, secondary. 8.94:1. |
| `--ink-faint` | `#8F99A6` | Ticks, tertiary. 6.50:1. |
| `--ink-ghost` | `#7C899F` | The quietest text tier. 5.30:1, and 4.51:1 on `--panel-raised`. |
| `--rule` | `#333A44` | Hairlines. |

Every ink tier clears 4.5:1 against every surface, `--panel-raised` included. An accessible
floor on a dark ground compresses the low end: the steps between mid, faint and ghost are 1.38x
and 1.23x rather than the wide jumps a light palette allows. That is deliberate, and it holds up
because the bottom tiers are already separated by type size (12 px labels, 10.5 px micro, 9.5 px
derivation labels) rather than by colour alone. Do not darken them to restore the old separation;
make the type smaller instead.

Dark ground because the app is largely about darkness resolving into value — the void cells
need to read as genuinely empty, and they cannot against a light surface. This is chosen for
the same reason as Anatomi QRIS's dark ground and stated as a considered departure, not a
default.

### 2.2 The one bit

The oracle's reply, and the most disciplined colour in the app.

| Token | Value | Meaning |
|---|---|---|
| `--valid` | `#4FB286` | Padding valid. The bit is yes. |
| `--invalid` | `#3A424C` | Padding invalid. Barely above the surface — a no is almost nothing. |

The lamp's *word* is the accessible equivalent for its colour, so it is the one part of a "no"
that cannot also be dim: it holds 4.5:1 while the housing stays near-black. The asymmetry lives
in the housing, not in the text.

`--invalid` is deliberately dim, because a rejection *is* almost nothing — one failed guess
among hundreds. `--valid` is the only bright event in a sweep, and when it appears after 200
rejections it should feel like the single thing that happened. The whole sweep is 255 near-silent
nos and one green yes, and the colour weighting must make that asymmetry felt.

### 2.3 The recovered

| Token | Value | Use |
|---|---|---|
| `--recovered` | `#C8A24A` | An intermediate or plaintext byte the attack has found. Warm gold. |
| `--crafted` | `#5B8DB0` | Bytes the attacker controls: the crafted block. Cool blue. |

Gold for what was extracted, blue for what the attacker supplies. The two never share a hue, so
at any moment a reader can see what was sent versus what was learned. The plaintext assembling
in gold, right to left, out of void, is the app's image.

### 2.4 The MAC

| Token | Value | Use |
|---|---|---|
| `--sealed` | `#7A5B8C` | The MAC layer, in the silence view only. |

Used once, for the defense that closes the oracle. It wraps the ciphertext and, when present,
every oracle reply goes `--invalid` and stays there. The gold never comes.

### 2.5 Prohibited

No terminal green. No matrix rain. No glitch, no scanlines, no monospace-as-costume beyond the
genuine need for byte alignment. No red for the invalid state — invalid is not an alarm, it is
the ordinary case, and colouring it red would make 255 non-events look like 255 warnings.

---

## 3. Typography

**IBM Plex Mono** for bytes, addresses, hex, and all the technical surface. The app is bytes in
a grid; a monospace is not a stylistic choice here, it is the only honest one, and Plex Mono is
warm enough to carry headings too.

**IBM Plex Sans** for the small amount of running explanation — the one or two lines that
introduce each stage.

No display face. The drama here is the void resolving to gold, not the letterforms, and a third
voice would distract from a screen whose whole job is to be believed.

### 3.1 Scale

Base 16 px. One ramp, nine rungs, each with a job. All sizes are fluid between a
380 px and a 1400 px viewport.

| Token | Size | Face | Use |
|---|---|---|---|
| `--t-display` | 32 → 56 | Plex Mono | The overture headline. Once per page. |
| `--t-figure` | 24 → 34 | Plex Mono | The oracle-call counter, recovered-byte count |
| `--t-h1` | 19 → 24 | Plex Mono | Scene titles |
| `--t-lede` | 17 → 20 | Plex Sans | The overture's supporting line |
| `--t-byte` | 17 → 22 | Plex Mono | The byte cells in the stack |
| `--t-plain` | 16 → 26 | Plex Mono | The recovered message in the message view |
| `--t-h2` | 16 → 19 | Plex Mono | Panel headings, diagram labels |
| `--t-body` | 16 | Plex Sans | **All** running prose |
| `--t-data` | 13 | Plex Mono | Addresses, secondary hex, tables |
| `--t-small` | 12 | Plex Mono | Labels and legends, never sentences |
| `--t-micro` | 10.5 | Plex Mono | The smallest labels |
| `--t-nano` | 9.5 | Plex Mono | The play glyph only. Never text: no sentence, label or gloss goes below `--t-micro`. |
| `--t-byte-mobile` | 14 / 15 | Plex Mono | The byte cells at phone widths, where the module is 30 px |

The rule that keeps this one scale rather than a pile of sizes: **prose is
`--t-body` and nothing else.** `--t-small` and below are for labels and data.
Every scene lede, panel note and caveat was previously set at `--t-small`, which
put the copy carrying all of the app's comprehension two rungs below the labels
it was explaining. It is now the second-largest thing in a panel after the
values, which is the correct order.

`font-variant-numeric: tabular-nums`. The call counter spins and must not shift width.

### 3.2 Prohibitions

No all-caps. No tracked-out labels. Sentence case. The byte cells are the only large type; they
carry the app and need no competition.

---

## 4. Layout

### 4.0 The overture

Before the instrument, one statement. A visitor arriving at the app meets a
recovery that has not started: an idle counter reading 0 and an idle lamp
holding no answer. Without a frame, that reads as a broken tool rather than a
loaded demonstration.

The overture is three elements and no more: a `--t-display` headline, one
`--t-lede` paragraph giving the mechanism and the stakes in plain language
before any jargon, and a single gold button that starts the recovery. It is the
only gold control in the app, because starting the sweep is the one action on
that screen that produces gold.

It renders no attack state and holds no logic. Its button is a second trigger
for the transport's existing toggle, placed in the content because the transport
is fixed to the bottom of the window and reads as chrome.

### 4.1 The interrogation

```
┌──────────────────────────────────────────────────────────────┐
│ Oracle · recover a message from a single bit of feedback     │
├────────────────────────────────────────┬─────────────────────┤
│                                        │                     │
│  CRAFTED   5B 8D … 2F [C4]  ← sweeping │      THE ORACLE     │
│  ───────────────────────────────────   │                     │
│  INTERMED  ·· ·· … ·· [3A]  ← found     │       ┌───────┐     │
│  ───────────────────────────────────   │       │  YES  │     │  one lamp
│  PLAIN     ·· ·· … ·· [S ]              │       └───────┘     │
│            15 14      1  0              │                     │
│                                        │   calls: 1,432      │
│  right → left                          │                     │
├────────────────────────────────────────┴─────────────────────┤
│  XOR:  crafted C4 ⊕ pad 01 = intermed 3A                     │
│        intermed 3A ⊕ realprev 7B = plain 41 'A'              │
├──────────────────────────────────────────────────────────────┤
│  MESSAGE   ▓▓▓▓▓▓▓▓░░░░░░░░  block 2 of 4                     │
├──────────────────────────────────────────────────────────────┤
│  [ cipher: AES ▾ ]   [ ▶ sweep ]  ●──── speed   [ MAC: off ] │
└──────────────────────────────────────────────────────────────┘
```

The stack is left and central. The oracle is a distinct panel on the right, deliberately
separated by space and a rule, because the thinness of the channel between them is part of the
point — a lot is being extracted through a very small opening.

### 4.2 The oracle panel

A sealed box with one lamp. The lamp is `--invalid` (dim) or `--valid` (bright) and shows the
reply to the most recent query. It has three display states, not two: `yes` and `no` are
reserved for actual replies, and before any question has been asked it shows `··`, the same
void glyph the stack uses for a byte it does not have. Rendering the idle state as `no` made
the app appear to have queried and been refused before the visitor had done anything, at the
largest type size on the landing view. The call counter sits beneath it.

Nothing else is in this panel. No history strip of past replies, no confidence, no hint. One
lamp, one number. Its austerity is the guarantee that the attack is working from one bit
(DESIGN.md §0).

### 4.3 The stack

Four rows, 16 columns, byte cells aligned into columns so each byte's vertical story reads at a
glance: what was sent, what the oracle judged, what it revealed, what it means.

The second row is `P_seen`, the padding the oracle is actually deciding on. It takes no hue:
§2 holds green, gold, blue and violet for the bit, the recovered, the crafted and the seal, and
`P_seen` is a derived view rather than a fifth meaning, so it reads as instrument neutral. It is
knowable only where the intermediate is known, so it fills exactly as far as the recovery has
reached and shows the forced pad the sweep is working against.

The intermediate and plaintext rows begin as `--void` cells — holes. The crafted row begins
populated in `--crafted` blue. As the attack proceeds, gold fills the intermediate and plaintext
rows from the right.

A column under active attack is marked by a subtle raise, not a colour — the sweep is happening
to that column and the eye should be there.

### 4.4 Grid and rhythm

8 px base. Byte cells are a fixed 40 px square on desktop, the module the whole layout aligns to.
Spacing scale: 8 · 16 · 24 · 40 · 64. Max width 76 rem.

Panels raised by value, hairline separated, 2 px radius. No shadow.

### 4.5 Mobile

The stack is the app and it stays. On a phone it shows one block at a time and scrolls
horizontally between blocks with snap points; the four rows stay vertically aligned. The oracle
panel moves above the stack as a single lamp and counter. The XOR resolution moves below. The
controls collapse to sweep, speed, and a sheet for cipher and MAC.

The byte cells shrink to 34 px, still legible, still tappable for the manual mode.

---

## 5. Instruments

### 5.1 The stack

Covered above. The one addition: hovering or focusing a resolved byte shows its full derivation —
the crafted value, the padding target, the intermediate, the real previous byte, and the XOR
chain — as a popover, so any single byte's claim can be audited without replaying the sweep.

### 5.2 The sweep

The active column's crafted cell cycles through candidate values in `--crafted`. For each, the
oracle lamp answers. Rejections are near-silent — the cell ticks to the next value, the lamp
stays dim. The accepting value stops the cycle, the lamp goes `--valid`, and the disambiguation
(§5.3) runs before anything is committed.

Speed from single-step to fast-forward. At fast-forward the individual rejections blur into a
rapid count and only the accept and the disambiguation are held — the mechanism, not the drudgery.

### 5.3 The disambiguation — the honest beat

When the last byte hits, the interface does not immediately commit. It perturbs byte 14 —
visibly, a flicker in that cell — and re-queries. Two outcomes:

- Lamp stays `--valid`: genuine `0x01`. The byte commits to gold.
- Lamp goes `--invalid`: the hit was a longer pad. The cell releases its gold, and the sweep
  resumes from the next candidate.

This is the moment that separates a correct attack from a broken one, and most visualisations
skip it. Give it room — a held beat, the perturbed cell marked, the re-query explicit. When it
catches a real false positive (a plaintext ending in `0x02`), that is the app at its most
honest, and the interface should make the catch legible rather than smoothing it over.

### 5.4 The XOR resolution

Two lines beneath the stack, shown when a byte commits: the crafted-vs-padding XOR giving the
intermediate, and the intermediate-vs-real-previous XOR giving the plaintext. Bytes slide into
the operation and the result slides out to its cell in the stack. Brief, and the bridge between
the abstract recovery and the concrete character that appears.

### 5.5 The message

A block-level progress strip: the ciphertext blocks, the current one, and the plaintext
accumulating as recovered characters. The oracle-call counter is prominent here — a block landing
near 2,000 calls is the evidence that this is cheap, and the number climbing is part of the
experience.

### 5.6 The cipher panel

The block cipher as a labelled box with the AES/toy toggle. Switching it re-runs the attack; the
recovery succeeds identically and at the same cost. The panel states, in one line, that this is
the point: the cipher is not the weakness.

### 5.7 The silence

The closing view. The MAC toggle wraps the ciphertext in a `--sealed` band. Run the sweep now and
the oracle lamp stays `--invalid` for every candidate — the MAC is checked first and fails before
decryption. The sweep runs its full 256 and no gold ever appears. The intermediate row stays void.

The contrast with every prior sweep is the entire lesson. One line of copy: the oracle now
answers the same to everything, so there is nothing to learn. Then stop. No summary, no
celebration.

---

## 6. Motion

### 6.1 The rule

Settled across eight apps:

**Continuous control → direct mapping, zero easing.** The speed scrubber, the manual byte editor.

**Discrete control → timed transition.** Cipher switch, MAC toggle, mode switch, block selection.

### 6.2 Durations

| Event | Duration | Curve |
|---|---|---|
| Sweep step (single-step / slow) | 180 ms per candidate | linear |
| Sweep at fast-forward | rejections collapsed; ~40 ms to result | linear |
| Disambiguation held beat | 500 ms | `cubic-bezier(.4,0,.2,1)` |
| Byte committing to gold | 260 ms | `cubic-bezier(.32,.72,0,1)` |
| XOR resolution | 400 ms | `cubic-bezier(.4,0,.2,1)` |
| Oracle lamp | 90 ms | linear |
| MAC band appearing | 400 ms | `cubic-bezier(.32,.72,0,1)` |

### 6.3 The orchestrated moment: a byte arriving from the void

The core beat, and it happens once per byte, dozens of times, so it must be right.

A void cell, holding nothing. The sweep resolves. The disambiguation confirms. Then the cell
does not fade in — it **resolves**: the void gives way to gold and the value is simply there,
having been discovered rather than revealed. In the same beat the plaintext cell above it
resolves the same way, and the XOR lines beneath show why.

The distinction from a fade is the whole point (DESIGN.md §0). A fade says the value was always
present and is now shown. A resolve-from-void says the value was absent and is now known. Only the
second is honest about what the attack did, and only the second produces the feeling the app
exists to produce.

### 6.4 The rhythm of a block

Sixteen bytes recovered right to left, each with its sweep, its disambiguation, its commit. The
early bytes feel slow — the reader is learning to read the beat. By the middle of the block the
rhythm is established and the fast-forward becomes tempting, which is correct: the point has
landed and the drudgery can be skipped. The design should make single-step compelling for the
first few bytes and fast-forward satisfying for the rest.

### 6.5 Restraint

No entrance animations. No hover glow on cells. No pulsing. No sound — an attack that beeps when
it succeeds is a toy, and this one is unsettling precisely because it is quiet.

### 6.6 Reduced motion

`prefers-reduced-motion: reduce`: the sweep becomes a stepper with no cycling animation — each
step is an instant state. Bytes resolve from void without travel. The disambiguation is a
two-state toggle. The XOR lines appear complete. The message fills without motion. Every value
stays reachable; only the theatre is gone, and the theatre was never load-bearing.

---

## 7. Copy

English, sentence case, no exclamation marks. Sparse.

The attacker *recovers*; the oracle *leaks*. Terms defined once at first use: intermediate block,
padding oracle, malleability, encrypt-then-MAC.

The cipher-irrelevance line lives in the cipher panel. The no-real-target line lives by the
oracle, once: this oracle answers about a message the app encrypted itself, and the app has no
way to reach any other. The silence needs one line and then silence.

No taunting, no congratulation. The message assembling in gold says everything; the copy stays
out of its way.

---

## 8. Quality floor

Assumed, not announced: usable at 380 px with the stack legible one block at a time; visible
keyboard focus everywhere including manual byte editing and the step control; every view has a
keyboard-reachable table equivalent; recovered intermediate and plaintext export as hex;
contrast 4.5:1 for text and 3:1 for graphical objects; reduced motion honoured; no network at
runtime, and no network APIs in the bundle at all.

## 9. Relationship to the house layer

Takes: the spacing scale, the motion curve family, the type floor, the continuous-versus-discrete
motion rule.

Contributes back:

**Resolve-from-void.** An unknown value rendered as genuine absence and resolved into presence,
rather than faded from faint to bold. The distinction encodes discovery versus revelation, and it
belongs in the house layer for any app where the honesty of "we did not already know this" is
the point — which is exactly the family's recurring theme.

**One-bit austerity.** A feedback channel rendered as literally one lamp, with any richer display
deliberately withheld, so the reader believes the constraint the app claims. Worth having as a
reminder that what an interface refuses to show can be as load-bearing as what it shows.

Departs in one place: the dark instrument ground, shared only with Anatomi QRIS. Here it is
required because the app is about darkness resolving to value and the void cells must read as
empty. Documented so it does not drift into a default.
