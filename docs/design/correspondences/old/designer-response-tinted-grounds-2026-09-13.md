# Tinted grounds — don't repaint the palette. Re-ink the tinted grounds.

**2026-09-13.** Reply to `tinted-grounds-notes-for-designer-2026-09-13.md`.

**Short version:** **no to A**, and there is a fourth option you did not list that costs far less
visually and follows a pattern the engine already has. The menu is a separate problem from the
wash, and it is not really a tint problem at all — your own numbers say so, and I think you stopped
one step short of the conclusion.

Your tables are internally consistent (8 + 33 + 58 = 99 of 414; 138 = 23 × 6). Nothing in them
needed correcting.

---

## 0. Two things I checked first so I could stop thinking about them

**The mix space is not a hidden lever.** `color-mix` in sRGB, in OKLab and in linear light produce
materially different grounds — on `default-dark` a 14% wash costs 8.25 → 6.17 in sRGB, 6.38 in
OKLab, and **4.11 in linear light**. So it was worth checking whether you were mixing in a space
that was costing you contrast for free. You are not: your `default-dark` column (5.83 → 4.87 →
4.43) tracks the sRGB shape almost exactly. **Checked, closed, no win there.** OKLab would be a
marginal improvement and not worth a migration.

**The wash cannot be fixed by choosing better colours, and that is provable rather than
measured.** `tone-wash` is *the role colour mixed into the surface*, so the ground moves toward the
ink. Channel-wise mixing is monotonic and linearisation is monotonic, so the ground's luminance
always lands between the surface's and the ink's — which means `contrast(ink, ground)` falls
strictly as the tint rises, for every colour, on every theme, reaching 1.0 at 100%. There is no
clever ink that escapes it.

What that costs, priced on the locked palettes: to still clear 4.5:1 after a 20% self-tint, a colour
needs roughly **6.0–6.3:1 flat on `default-light`** against the ~5.1 it sits at now. That gap is
your ΔE ~8. Option A is not moving the colours to somewhere better; it is buying headroom on the
flat grounds purely to spend it on the washed ones.

---

## 1. A is a no

Two reasons, and the second is the one I would not move on.

**It taxes the many to fix the few.** The flat grounds carry the overwhelming majority of semantic
text in the product, and 0 of 138 pairs fail there. A degrades all 138 to fix a subset of the
derived-ground uses. That is the wrong direction of travel: the fix should be local to the thing
that broke.

**Eleven of your twenty-three themes are homages, and A makes them measurably wrong.** Darcula,
Nord, Solarized Dark, Solarized Light, Catppuccin Mocha, Catppuccin Latte, Tokyo Night, Gruvbox
Dark, GitHub Light, Material Dark, Material Light. Their entire value to a user is that they *are*
the palette they are named after — that is the whole reason someone picks Gruvbox over a theme you
designed. A ΔE of 7.7 is roughly a full step on a colour ramp; it is four times the threshold you
correctly cite as the point where people notice. Shipping Nord with its semantic colours a visible
step off Nord is a product cost, not just an aesthetic one, and it is not one I would pay to fix a
hover state.

This is the part of the decision that is genuinely mine rather than the engine's, so: **no.**

**One request on the numbers.** Please label the ΔE. `COLOR-SPEC.md` asks for this specifically
because CIE Lab ΔE\*ab and OKLab distance differ by about 100×, and an unlabelled figure is worse
than none. From your "ΔE 2 is the noticeable threshold" and "ΔE 0.4–0.6 is invisible" I have read
all of yours as **CIELAB ΔE\*ab** and everything above assumes that. If it is OKLab distance the
whole magnitude argument inverts and I would want to look again.

---

## 2. Option D — the ground moved, so the ink should move. Only the ink, and only there.

**The engine already has this pattern and the framework already relies on it.** `primaryFill` has
`primaryOnFill`. That is exactly why the `filled` variant is not in your failure table: when the
framework paints a role-coloured ground, it uses an ink audited *against that ground*. The `light`
variant paints a role-coloured ground and then borrows the ink that was audited against the flat
surface. **That borrowing is the defect** — not the colours, and not the tint strength.

So: give `tone-wash` its own on-colour, the way `fill` has one.

**Ground unchanged. Flat grounds unchanged. One new token per role.** I checked that one ink covers
both wash strengths: derive it against the 20% hover ground and it clears the 14% resting ground
with margin, because contrast rises as the tint falls.

Worked on the locked palettes — my values, not a reproduction of your table:

| | role | flat ink (unchanged) | on-wash ink | on wash @14% | @20% | ΔE\*ab moved |
|---|---|---|---|---|---|---|
| **default-dark** | info / accent | `#1ad1c4` | `#1ad1c4` | 6.17 | 5.38 | **0.00** |
| | warning | `#f5b12b` | `#f5b12b` | 6.40 | 5.60 | **0.00** |
| | success | `#56b93e` | `#58bb40` | 5.07 | 4.51 | 0.72 |
| | error | `#ff6b5e` | `#ff7366` | 4.96 | 4.51 | 4.30 |
| | purple | `#bb7eff` | `#bf89ff` | 5.03 | 4.51 | 7.11 |
| **default-light** | accent | `#007870` | `#006c65` | 4.95 | 4.54 | 4.96 |
| | success | `#227b00` | `#1e7000` | 4.89 | 4.50 | 5.87 |
| | warning | `#8e6200` | `#825900` | 4.92 | 4.53 | 5.13 |
| | error | `#c5342d` | `#b62320` | 4.99 | 4.54 | 5.11 |
| | purple | `#923bde` | `#872cd1` | 4.94 | 4.53 | 4.57 |

Hue holds to within 0.4° in every case. On the dark theme two of five roles need **no ink at all**
and the median move is 0.72; on the light theme the moves run 4.6–5.9. Both are below A's 7.7
median — and, far more importantly, **nothing on a flat ground moves by a single step.** Nord stays
Nord everywhere a user reads normal text.

**And this is also just the better design.** Every mature system that ships tinted chips — GitHub
labels, Linear badges, Mantine's own `light` variant in its stock themes — uses a *deeper* ink of
the same hue on the tinted ground than on the plain one. A tinted chip with the flat-ground ink on
it looks washed out even when it passes. D is not a compliance workaround; it is what the component
should have looked like.

See `tinted-grounds-proofs-2026-09-13.png`, rows 1 and 2: row 1 is what A moves and D leaves alone,
row 2 is the identical ground under the two inks.

---

## 3. B: keep it in your pocket, and note the gap in it as written

If D is too much engineering for the schedule, B is a reasonable holding position for the wash —
but **as written it only fixes the hover.** Dropping `tone-wash-strong` from 20% to 10% closes the
33 failures on that ground. The 8 failures on `tone-wash` at 14% are the **resting** state of Alert,
Badge and the `light` Button on five themes, and B does not touch them. You would need to drop the
resting wash too, and at that point the `light` variant is barely tinted and you have lost the
variant rather than fixed it.

Halving the hover delta on the second most-used button style is also a real affordance loss, and it
is a loss with no upside — D gets the same compliance and keeps the hover.

**B ranks third. D first, B only if D is out of budget.**

---

## 4. The menu — your own numbers say this is not a tint problem

This is where I think the note stops one step early. You wrote *"the margin on the menu's own
ground is already too thin for a tint to be the thing that broke it."* That is the right
observation. The conclusion that follows is not *"lightening cannot be made to work"* — it is
**the menu's own ground is not one of the four grounds the selection routine audits.**

Here is the arithmetic. Your `flat` column says the worst semantic colour on any audited ground on
any theme is **5.00**. I took the surface luminances I solved from your focus-ring table, put a
colour at exactly 5.00 on each, and tinted toward the most extreme text a theme could possibly have
(pure white on dark, pure black on light — harsher than any real theme):

| tint | worst result across all 23 themes |
|---|---|
| 1% | **4.81** — clears |
| 2% | **4.67** — clears |
| 4% | 4.38 — fails |
| 8% | 3.88 — fails |

**A 1% tint cannot take anything from 5.00 to below 4.5. It is not arithmetically possible.** So
your five failures at 1% are not being caused by the tint; they are colours that were already below
4.5:1 on the menu's ground before any highlight was applied. That ground is unaudited, and it is
the actual defect. The highlight only made it visible — which is the same thing that happened when
you fixed the sanitiser.

**What that changes.** If the menu drew on an audited surface, here is the same 8% tint, starting
from each theme's own worst flat contrast (your numbers), still under the harshest text assumption:

| | now | on an audited ground |
|---|---|---|
| themes clearing 4.5:1 at 8% | **1 of 23** | **14 of 23** |
| worst theme | 3.63 | 4.10 |
| best theme | 5.17 | 5.86 |
| median largest safe tint | — | **10.3%** |

The three that still would not clear at 8% — solarized-dark, solarized-light, catppuccin-latte —
are the three whose flat worst is only 5.00–5.22, and they would take about a 5% tint, or the D
treatment on that ground.

**So the first question is not "what should a highlighted row look like." It is: what ground is the
menu actually drawing on, and why is it not in the selection routine's list?** I would want that
answered before anyone designs a replacement for a highlight that may not need replacing.

---

## 5. The thing nobody has measured: the highlight is not a valid focus indicator

Separate from all of the above, and I think more serious.

The menu highlight is on screen *"under the cursor, or under the arrow keys."* Those are two
different things with two different requirements. You have measured 1.4.3 on the text. Nobody has
measured 1.4.11 on the **state**, and under arrow-key navigation the highlight *is* the keyboard
focus indicator.

The highlight ground against the un-highlighted row, all 23 themes:

| tint | state change | |
|---|---|---|
| 8% (shipped) | **1.19 – 1.28 : 1** | none of the 23 reaches 3:1 |
| 14% | 1.37 – 1.57 | |
| 20% | 1.58 – 1.93 | |
| **33 – 43%** | 3.00 | the tint needed to clear 1.4.11 |

The trade is closed at both ends. A tint weak enough to keep the text legible is nowhere near a
compliant focus indicator; a tint strong enough to be one (33–43%) destroys the text outright.
**No value of that tint is both.** A ground tint cannot carry the focused state, on any theme, at
any strength.

### What the row should do instead — and it is already built

**A leading rail: 3px, full row height, in `primaryStroke`.**

`primaryStroke` is the core of the focus ring you shipped on Thursday, and **your own focus-ring
table already proves it clears 3:1 against every theme's surface** — the `core:surf` column runs
**3.64 to 5.72 across all 23 themes**. No new audit, no new token, no new selection pass. The
indicator is already measured and already in the product.

That decomposes the row cleanly:

- **the rail** carries focus — measurable, compliant, theme-independent, and legible at a glance;
- **the tint** becomes decoration and hover affordance only, free to be as weak as the text needs;
- **the text** keeps its audited ink.

It also fixes something the tint never could: at 1.2:1, a highlighted row is genuinely hard to find
with the eye when you are arrowing quickly through a long menu. The rail is a positional signal, not
a luminance one. Row 3 of the proof sheet is the two side by side — the tinted row is barely
locatable, the railed one is instant.

If you would rather the rail were not the only treatment, keep the tint underneath it. They compose;
nothing about the rail requires the row to stay flat.

---

## 6. Answers to your three questions

1. **Is the visible repaint in A acceptable?** **No.** It taxes 138 passing flat-ground pairs to fix
   a derived-ground bug, and it moves 11 homage themes visibly off the palettes they are named
   after. Take **D** instead: the derived ground gets its own ink, one token per role, flat grounds
   untouched.
2. **Is the weaker 10% hover in B acceptable?** Only as a fallback if D is out of budget — and note
   that B as written leaves the 14% resting wash failing on five themes, so it is not a complete
   answer to the wash either.
3. **What should a highlighted menu row look like?** **A 3px leading rail in `primaryStroke`,** with
   the tint demoted to decoration. But answer the prior question first: the menu's ground is
   unaudited, and that — not the tint — is what is producing most of those 58 failures.

## 7. What I need back

- **What is the menu's own ground?** A token name is enough. Everything in §4 is conditional on it.
- **Confirm the ΔE unit is CIELAB ΔE\*ab**, and label it in the spec.
- **Does the focus ring paint on menu rows today?** If it does, §5 is already handled and I would
  rather know that than have you build a rail you do not need.

Nothing here is urgent in the sense you meant it — no screen uses these components yet, and you
were right to bring it before implementing rather than after. But §5 is the one I would not let
reach a screen: a keyboard-only user arrowing through a dropdown currently has a 1.2:1 signal
telling them where they are, and that is the kind of thing that is invisible to everyone testing
with a mouse.

---

**On method, one note.** I have deliberately not tried to reproduce your 414-pair table. I do not
hold your six semantic colours, and every time in this engagement that I have modelled your engine
rather than measured it, I have been wrong. So everything above is one of three things: your own
numbers rearranged, general colour maths that holds for any palette, or the locked Mullion palettes
used as a labelled worked example. The surface luminances in §4 come from solving your focus-ring
table, which assumes the menu sits on the same surface the semantic colours are audited
against — if it does not, those per-theme figures move and I would want to redo them.

---

**Attached:** `tinted-grounds-proofs-2026-09-13.png` — flat-ground text before and after an
A-shaped repaint; the same wash ground under today's ink and D's ink; and the highlighted menu row
as a tint versus as a rail.
