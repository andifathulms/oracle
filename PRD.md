# Oracle — Product Requirements

**Name:** Oracle
**Descriptor:** Recover a message from a single bit of feedback
**Type:** Static single-page application. No backend, no network at runtime.
**Deploy target:** GitHub Pages.
**Interface language:** English.

> **On the name.** *Oracle* names the mechanism — the oracle is the thing that was not
> supposed to matter and does — and carries a fitting double meaning: the app reveals what
> you should not be able to know. It collides with the database company, so the subtitle
> disambiguates and does real work: "recover a message from a single bit of feedback."
> *Padding Oracle* is the unambiguous fallback if the collision proves a problem.

---

## 1. The thesis

You are given a ciphertext and no key. You are given a server that will tell you exactly one
thing about any ciphertext you send it: whether its padding was valid. One bit.

From that one bit, repeated, you recover the entire plaintext — byte by byte, without ever
attacking the cipher.

This is Vaudenay's padding oracle attack, and its lesson is stated best by one of its
explainers: it lets you *get rid of cryptography* if you know how padding works. The AES is
never broken. The padding check is the entire hole.

That is the shape shared with the rest of this family — the vulnerability is not where anyone
is looking. In Query Planner the plan is chosen from a false belief; in Linkage the identifier
was never the name. Here the secret is not protected by the strength of the cipher, and the
cipher's strength is irrelevant to whether the message leaks.

## 2. The mechanism, precisely

This section is the specification the engine is built from. It is exact on purpose.

CBC decryption computes each plaintext block as:

```
Pᵢ = Dk(Cᵢ) ⊕ Cᵢ₋₁
```

`Dk(Cᵢ)` — the block cipher applied to the current ciphertext block — is the **intermediate
block**. It is fixed by the key and unknown to the attacker.

But `Cᵢ₋₁` is just bytes, and the attacker sends them. So the attacker controls the plaintext
the server checks, via:

```
P_seen = intermediate ⊕ C_crafted
```

even while `intermediate` stays unknown.

**Recovering the last byte of a block:**

1. Sweep the last byte of `C_crafted` through all 256 values.
2. For exactly one (in the simple case), `P_seen` ends in `0x01` — valid padding — and the
   oracle returns valid.
3. That value gives `intermediate[15] ⊕ C_crafted[15] = 0x01`, so
   `intermediate[15] = C_crafted[15] ⊕ 0x01`.
4. XOR that intermediate byte with the **real** previous block's byte to get the real
   plaintext byte: `P[15] = intermediate[15] ⊕ C_real[15]`.

A plaintext byte, recovered with no key, from a single bit of feedback.

**Recovering the next byte:** to attack `intermediate[14]`, force the last byte's `P_seen` to
`0x02` (you know `intermediate[15]`, so you can), and sweep byte 14 until `P_seen` ends in
`0x02 0x02`. Continue backward through the block. Each recovered intermediate byte lets you
fix the tail to the next padding value.

**Cost:** approximately 128 oracle calls per byte on average, so about 128·n per n-byte block.

## 3. The subtlety that is the app's best moment

The last-byte sweep can produce a **false positive**.

If the real plaintext already ends in `0x02`, then a crafted byte producing `... 0x02 0x02`
is *also* valid padding, and the oracle returns valid for a reason that is not `0x01`. A naive
attack records the wrong intermediate byte and silently corrupts the whole block downstream.

The correct handling: on a hit for the last byte, **perturb the second-to-last byte** of
`C_crafted` and ask again. If padding is still valid, the hit was a genuine `0x01` (the
second-to-last byte does not participate in a single-byte pad). If it breaks, the hit was a
longer valid pad, and the sweep must continue.

Handling this correctly is the difference between a demo and a real attack. Most padding
oracle visualisations have this bug and do not notice. **This app makes the disambiguation a
visible, animated step** (§5, §6.4) — the moment the attack double-checks itself — because it
is both the mark of a correct implementation and a genuinely satisfying beat no other
visualisation of this attack shows.

## 4. Scope

### In

- CBC mode, PKCS7 padding, 16-byte blocks.
- Full attack: last byte, subsequent bytes, correct false-positive disambiguation.
- Multi-block ciphertexts: whole-message recovery.
- The three-layer view (§5.1), the sweep (§5.2), the XOR resolution (§5.3).
- The encrypt-then-MAC defense and the silenced oracle (§5.6).
- Bit-flipping mode (§4.3) as a second demonstration of the same CBC malleability.

### Out

- Other modes (ECB, CTR, GCM) except as named contrast. GCM appears only as the thing you
  should have used.
- Other padding schemes. PKCS7 only. The attack generalises but the app does not need to.
- Real block sizes other than 16.
- Any network capability whatsoever. See §7.1 — the app cannot reach a real server because it
  has no way to reach anything.
- Timing-based oracles. This is the padding-validity oracle; reaction-time side channels are
  a different app.

### 4.3 Bit-flipping mode

A short second mode using the same CBC malleability from the other direction: flipping a bit
in the previous ciphertext block flips the corresponding plaintext bit. The user edits a
decrypted message they cannot encrypt — turning `user=guest` into `user=admin` — without the
key.

This is included because it is the same property (`Pᵢ = Dk(Cᵢ) ⊕ Cᵢ₋₁`, attacker controls
`Cᵢ₋₁`) seen as tampering rather than recovery, and having both makes the CBC lesson whole. It
is small and shares the entire engine.

## 5. Instruments

Full visual and motion specification in DESIGN.md.

### 5.1 The stack — the hero

Four aligned rows of 16 byte-cells each:

- **Crafted previous block** — what the attacker sends. Editable in manual mode, driven by the
  sweep in auto mode.
- **Seen** — `P_seen = intermediate ⊕ crafted`, the padding the oracle actually judges (§2).
  Knowable only where the intermediate is known, which is exactly the forced tail, so the row
  shows the pad being held at `03 03 03` while the next byte sweeps and stays void everywhere
  the attacker is still guessing. It is the one term of §2's mechanism the stack used to omit,
  and it reveals nothing the attack does not already hold.
- **Intermediate block** — `Dk(Cᵢ)`. Unknown, revealed byte by byte as the attack recovers it.
- **Plaintext** — resolves as each intermediate byte is found.

The intermediate row is the point. It starts entirely unknown and fills in **right to left**.
Each time a byte resolves, the plaintext byte above it resolves in the same beat. Watching the
message assemble backward, driven by nothing but padding-valid answers, is the app.

### 5.2 The sweep

The inner loop. The target byte of the crafted block cycles through candidate values; for each,
the oracle's one-bit verdict flashes. 255 rejects, one accept.

Fast enough to read as mechanical search, with a speed control from single-step to
fast-forward. On the accepting value the cell settles and the disambiguation check (§6.4) runs.

### 5.3 The XOR resolution

When a byte is found, the two XOR relationships are shown as physical operations:

```
intermediate = crafted ⊕ padding_target
plaintext    = intermediate ⊕ real_previous
```

Bytes slide into an XOR and produce the result. This is where "no key, and I am reading the
message" stops being a claim and becomes a thing the user watched happen.

### 5.4 The message view

The full multi-block ciphertext with recovery progress across all blocks, and the recovered
plaintext accumulating. A request counter runs — a 16-byte block is roughly 2,000 oracle calls
and the counter earns the point that this is cheap, not magical.

### 5.5 The cipher panel

The block cipher shown as a labelled box. A toggle switches it between a real AES (WebAssembly)
and a clearly-labelled toy permutation.

**The switch changes nothing about the attack**, and that is the demonstration: the same attack
recovers the plaintext at the same cost with either. The cipher is irrelevant; the padding
check is the hole. State it in this panel, plainly.

### 5.6 The silence — the closing move

Turn on encrypt-then-MAC. Run the identical attack.

Now every crafted ciphertext fails the MAC check *before* decryption is attempted, so the
oracle returns the same verdict every time. The sweep produces 256 identical rejections. The
channel that leaked one bit now leaks nothing, and the attack visibly starves — no green ever
appears.

This is what authenticated encryption is for, shown rather than asserted. It is the app's final
frame and it should feel like a door closing.

## 6. Commitments

### 6.1 The app cannot cheat

The plaintext must be recovered by the attack, not read from a variable the UI already holds.

The key and the original plaintext are generated in an engine layer the view cannot access.
The view receives only what the attack has recovered. When a plaintext byte appears on screen,
it appears because the attack produced it.

This is the same integrity discipline as Mind Reader's sealed prediction, and like that one it
is enforced by architecture and by test (§8), not by convention. An educational attack demo
that secretly has the answer is a magic trick, and the whole value here is that it is not one.

### 6.2 The false positive is handled and shown

§3. The disambiguation is correct in the engine and visible in the interface. An implementation
that skips it is wrong, and a visualisation that hides it misses the best moment.

### 6.3 The cipher's irrelevance is demonstrated, not stated

§5.5. The user can switch the cipher and watch the attack succeed identically. Telling them the
cipher does not matter is weaker than letting them break it either way.

### 6.4 Honest about what this is and is not

The attack requires an oracle. This app is the only oracle in reach, operating on a message it
encrypted itself moments ago. There is no network, so there is no real target. Stated once,
plainly, where a visitor might wonder — not as a disclaimer wall, because unlike a
re-identification tool there is nothing here to misuse: the capability is inseparable from a
server that leaks padding validity, and the app cannot talk to one.

### 6.5 Nothing leaves the device

No network at runtime. The strongest possible version of this commitment, since the app has no
network code at all.

## 7. Correctness

### 7.1 No network capability exists

Asserted by a test that greps the bundle for `fetch`, `XMLHttpRequest`, `WebSocket`, and
`navigator.sendBeacon`. None may appear. The app's inability to reach a real server is a
property of the build, not a promise.

### 7.2 The attack is correct

- Against a corpus of random keys, IVs, and plaintexts of varying lengths — including
  plaintexts whose final bytes are `0x01`, `0x02 0x02`, and other genuine padding-collision
  cases — the attack recovers the exact plaintext every time.
- The false-positive disambiguation is exercised specifically: a test with a plaintext ending
  in `0x02` must trigger the double-check and recover correctly. Without disambiguation this
  test must fail — include a version assertion proving the naive path breaks on it, so the
  fix is known to be load-bearing.
- Oracle-call counts fall near the expected 128 per byte, confirming the attack is not
  accidentally brute-forcing more than it should.

### 7.3 CBC and PKCS7 are correct

- Encrypt/decrypt round-trips for all block-boundary cases, including a full padding block when
  the message is a multiple of 16.
- PKCS7 validation accepts only correct padding and rejects all malformations, including
  `0x00`, over-long, and inconsistent pads.
- The real AES matches a known-answer test vector. The toy permutation is a bijection.

### 7.4 The MAC closes the oracle

With encrypt-then-MAC enabled, the oracle returns a constant verdict across a full sweep, and
the attack recovers nothing. Asserted.

### 7.5 The view cannot see the secret

A type-level test: the view layer's props type has no path to the key or the original
plaintext. Plus a runtime test that runs the attack with the original plaintext held in a
closure the view never receives, and confirms the on-screen result matches — proving the
screen's content came from the attack.

## 8. Acceptance criteria

1. All tests in §7 pass in CI and block deploy, including the no-network grep and the
   view-cannot-see-secret test.
2. The naive-attack-fails-on-0x02 assertion is present and passing (i.e. the disambiguation is
   proven necessary).
3. The sweep animates at 60 fps at fast-forward, and single-step is genuinely one oracle call
   per activation.
4. A full 16-byte block recovers with a visible request counter landing near 2,000.
5. Switching the cipher mid-session does not change the attack's success or cost.
6. Enabling the MAC visibly starves the attack — no accepting verdict appears in a full sweep.
7. `prefers-reduced-motion` honoured: the sweep becomes stepped, the stack fills without
   travel.
8. Fully keyboard operable, including manual byte editing and step control.
9. Every view has a keyboard-reachable table equivalent; the recovered intermediate and
   plaintext export as hex.
10. Zero runtime network requests, and no network APIs in the bundle at all.
11. Bundle under 250 KB gzipped including the AES WASM.
12. Usable at 380 px, with the three-layer stack legible — it may scroll horizontally on a
    phone, one block at a time.
