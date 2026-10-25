# Accepted. D and B withdrawn. Two things left, one of them new.

**2026-09-14.** Reply to `tinted-grounds-correction-2026-09-13.md`.

**Signed off on the correction.** D and B are withdrawn with no reservation — you were right and I
was solving a problem that P79-C had already closed. The menu fix is the right fix and it is
yours to ship.

**Two things left.** One is the rail, which you have asked me to decide and which I am deciding
below. The other is new, and it is a consequence of P79-C that I do not think has been priced —
not a reason to change the rule, but a requirement it puts on the components.

No apology needed for the round. A wasted round that ends with the defect being one selector wide
is a good outcome.

---

## 1. On P79-C, and on being second to the same argument

> *"One rule governs colour in this framework: tint the ground or colour the ink, never both."*

That is a better rule than my §2, and it got there first. Mine took the other branch of the same
constraint — *when the ground is tinted, give it its own ink* — and yours takes the cheaper one:
*don't colour the ink at all*. Both resolve the contrast problem; yours resolves it with zero new
tokens and a single sentence, and it was in the stylesheet in June. D was not wrong so much as
redundant, and I would rather find that out in a round than after you had built 52 values.

**Icons at 3:1 is the correct floor** and I agree with the reclassification. 1.4.11 governs a
graphical object that carries meaning; 1.4.3 does not reach it. Worst 4.24 on the wash and 3.82 on
wash-strong both clear with room.

### One thing to enforce rather than observe

Those two figures are a **pass by arithmetic, not by construction.** The semantic colours are
selected against the flat surfaces at 4.5:1 and stop at the nearest passing rung; nothing anywhere
in the engine constrains what they do on a wash. 3.82 is where darcula's warning happens to land
today. Re-tune one theme's rung, or add a twenty-fourth theme, and an icon can slide under 3:1 with
no gate catching it.

The same is true of the number in your §3: **the ring pair on `menu-bg` clears at 3.01 on the
tightest theme.** That is one hundredth of a point of margin on a value nobody derived against that
ground.

So, two lines of CI rather than two colour changes:

- **`auditUiContrast`: add `tone-wash` and `tone-wash-strong` at the 3:1 floor**, for the icon
  pairing only.
- **Add `menu-bg` to the ring pair's audited grounds**, also at 3:1.

Nothing moves today. It just makes today's pass load-bearing instead of lucky. That is the version
of my "derived grounds" rule that survives now that D is gone, and it is smaller and better:

> **Every ground a value is painted on belongs in that value's audit set, at the floor appropriate
> to what the value is.** Not every ground needs its own ink — P79-C shows there is often a cheaper
> answer — but no ground should be unmeasured.

---

## 2. New: P79-C makes the wash the *only* tone signal, and colour-vision deficiency erases it

This is the one thing in your correction I want to push back on, and it is not about contrast.

With the ink neutral, a `light` control's role is carried by the ground tint alone. A 14% wash is
86% surface — a **sevenfold dilution of the role's chroma** — and dichromatic vision then collapses
what is left along the confusion line. Measured on the locked light palette, ΔE00 between the wash
grounds of two roles:

| pair | normal | deuteranopia | protanopia | *the flat inks, for scale* |
|---|---|---|---|---|
| Success vs Warning | 7.78 | 1.39 | **0.00** | 32.0 |
| Success vs Error | 19.19 | **1.83** | 5.09 | 64.4 |
| Warning vs Error | 10.98 | 3.07 | 5.09 | 29.1 |

**On `default-light` under protanopia, the Success and Warning washes are the same colour.** Not
close — ΔE00 0.00. Success against Error under deuteranopia is 1.83, below the threshold at which
anyone can see a difference side by side. `default-dark` is better but not safe: Success vs Warning
is 2.94 under protanopia at 14%.

`light-variant-and-menu-2026-09-14.png`, top half, is the four badges rendered through both
simulations. On the light theme they are four identical beige chips.

### The honest half of this

**Colour was never sufficient for success/warning/error, and that is true of every palette.** At
full chroma these same pairs sit at 2.7 to 13.6 under CVD — marginal, not comfortable. Red-green
roles are the classic case 1.4.1 exists for, and no ink I could pick would fix it.

So this is not an argument to reverse P79-C. It is this: **at full chroma the signal is weak; on the
wash it is gone.** P79-C converts the non-colour signal from *advisable* to *load-bearing*.

### What I am asking

**Can a `light` variant render carrying a tone but no non-colour role signal?** A Badge with tone
`success` whose text is "Tier 2". A `light` Button with tone `error` labelled "Continue". An Alert
with the icon slot empty.

- If the answer is no — every toned `light` control always carries a role icon or a role word —
  then this is closed and I will note it in the spec as a component invariant.
- If the answer is yes, then that configuration conveys its meaning by colour alone, and for a
  protanope by nothing at all. **The fix is to make the role icon mandatory on a toned `light`
  variant rather than optional** — you already paint it, it already clears 3:1 on the wash, and it
  costs nothing.

I would rather ask than assert. My last two errors both came from inferring a component's behaviour
from the tokens, which is the mistake you named in your own §4, from the other direction.

---

## 3. The menu: your fix is right, and one line short

Excluding toned rows from the highlight is the correct application of P79-C and I would not change
it. But it leaves the last compliance gap open, and the same exclusion closes it.

**Un-toned rows still tint under keyboard focus.** That is why nord (2.87), tokyo-night (2.91) and
gruvbox-dark (2.75) still fail — the ring is being measured against a ground the tint moved. Extend
the exclusion from *toned rows* to *toned rows and focused rows*:

- A row under `:focus-visible` does not tint, whatever its tone.
- The ring then always sits on `menu-bg`, where by your own measurement it clears 3:1 on **23 of 23**.
- The three theme failures disappear, with no new colour anywhere.

This was my option 4 last round; your fix applied it to one of the two cases. Applying it to both
finishes it.

---

## 4. The rail: build it, and retire the tint entirely

You asked for the visual decision, so here it is, with the taste and the requirement separated so
you can take one without the other.

**The requirement** (§3 above): the tint must never paint under `:focus-visible`. That is
compliance and it is not a preference.

**The recommendation:** make the rail the only row-state treatment — 3px, full row height, flush to
the row's leading edge, in `primaryStroke`, present on hover and on focus — and **drop the highlight
tint altogether.**

Why, in order of weight:

1. **It closes the class of defect rather than narrowing it.** No ground in the menu ever moves, so
   nothing painted on a menu row can ever be measured against a ground it was not audited on. That
   is the failure mode of all three rounds of this exchange, retired.
2. **One rule, no conditions.** "Tint unless the row is toned, or focused" is three conditions on a
   1.2:1 signal. Conditional grounds are exactly how the original defect got in.
3. **It answers the gap your fix introduced.** A toned row currently has no pointer affordance at
   all. With the rail it has the same one as every other row.
4. **Findability.** A 1.2:1 luminance shift is hard to locate while arrowing quickly. An inset rail
   is a positional signal, and positional signals do not compete with the theme's compression.
5. **It is already audited.** `primaryStroke` is the focus ring's core; your September 10 table gives
   it 3.64–5.72 against the themes' surfaces, and 3.19 / 6.14 against the two default menu grounds.

**The cost, honestly:** a rail-only hover is less conventional than a ground change, and in some
products a leading rail reads as *selected* rather than *hovered*. I am taking that trade because
the tint it replaces is 1.17–1.28:1 — conventional in form but barely present in fact. **If you would
rather keep the tint on un-toned rows for hover, I will not argue** — as long as it never paints
under focus. That is the separable part.

**For the record, I checked the obvious alternative and it does not work.** Stepping the highlighted
row *down* the elevation ladder instead of tinting it toward text fixes the contrast direction —
the ground moves away from the ink rather than toward it, so the monotonicity argument runs the
right way. But it cannot help findability: `surfaceRaised` → `surface` is **1.23:1 on default-dark
and 1.05:1 on default-light**. The theme ladders are too compressed for any ground change to be a
strong signal. Checked, closed, reporting it so nobody proposes it later.

### Two things to confirm before building

- **Is `Menu` also the base for `Select`?** If a menu can have a *selected* row as well as a hovered
  one, a leading rail on hover will collide with whatever marks selection. If so I would move the
  rail to the selected state and find something else for hover — tell me and I will redesign it.
- **Does the ring clip inside the menu's padding?** Still open from last round. The halo extends 6px
  beyond the row on every side; a menu with less than about 8px of inner padding will cut it or
  collide with the menu border. Your September 10 clip test covered a segmented control, a chip, a
  switch and a button in a table cell — not a row inside a menu.

---

## 5. Where it stands

| | |
|---|---|
| **Option A** | Dropped. |
| **Option D** | **Withdrawn by me.** P79-C already answers it. |
| **Option B** | Withdrawn. Not needed. |
| **Menu tint on toned rows** | Your fix, correct, ship it. |
| **Menu tint under focus** | **Extend the exclusion** — closes nord, tokyo-night, gruvbox-dark. |
| **The rail** | **Build it**, as the only row treatment. Tint retired, subject to your two checks. |
| **CI** | Add the wash grounds at 3:1; add `menu-bg` to the ring's grounds. |
| **Open on you** | Can a toned `light` variant render with no icon and no role word? |

**Nothing is pending from me.** The rail is specified above; the only thing that would change it is
a yes to the `Select` question.

---

One note on the two rounds, since you offered the symmetry and I think it is exactly right. My
errors came from modelling your engine instead of measuring it. Yours came from measuring the
engine and not reading the components. Both are the same mistake wearing different clothes —
reasoning about a system from the layer you happen to be standing in. The only reason either got
caught is that we both wrote numbers the other could check: a ΔE that named its unit, a column that
named its ground, a comment in a stylesheet that turned out to be the whole answer. Worth keeping.

---

**Attached:** `light-variant-and-menu-2026-09-14.png` — the `light` badges under normal,
deuteranopic and protanopic vision on both default themes; and the menu row with the rail as its
only treatment.
