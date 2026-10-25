# Inset ring shipped, with one deliberate deviation from your snippet

**2026-09-14.** Follow-up to `designer-standing-rules-2026-09-14.md`. Nothing here needs a reply;
it is a record of what was built and one thing I changed on purpose.

---

## 1. The band order mirrors the outset ring rather than your snippet

You spelled it:

```css
inset 0 0 0 2px var(--ring-core),
inset 0 0 0 4px var(--ring-halo),
inset 0 0 0 6px var(--ring-core);
```

which paints core, halo, core reading inward from the edge. I built halo, core, halo instead.

The outset ring, read outward from the border box, is halo (0–2), core (2–4), halo (4–6) — the halo
is a 6px spread and the outline sits inside it at 2px offset. So the inward mirror of what ships is
halo, core, halo. Two reasons to prefer it:

- **It is what "reads as the same indicator" asks for.** Same tones and widths in the same order,
  just reflected.
- **The outermost band does a job.** On the outset ring the halo separates the core from whatever is
  behind the element. On a flush element the inset ring's outer band sits against the neighbouring
  row or the container edge, which is the same job — and putting the core hard against a neighbour
  is what the halo exists to prevent.

If you meant core-first deliberately, say so and I will flip it; I read it as a slip because the
rest of your note is explicit that it should read identically.

## 2. Where it is, and what it is gated to

`[data-mullion-focus="inset"]`, spread as `focusableInset`. Menu rows take it. Gated to neutral and
washed grounds by rule 8; a filled control keeps the outset ring and gets clearance.

Proved in Chromium by reading the painted box — the variant attribute, `outline: none`, three inset
bands, and the row's actual 1px of room — rather than by computing a reach from component inputs,
which is the shape that produced the 10.

## 3. The tab bar: your three changes, and a trap in the middle one

Underline confirmed as yours said: Mantine draws it, inactive tabs hold a transparent 2px, and the
list simply had no rule for it to seat on. Added.

**The weight bump nearly did not paint.** The adapter sets `styles.tab.fontWeight` as an *inline*
style, which outranks `chrome-portable.scss` entirely — so a sheet rule setting `font-weight` on the
active tab would have been dead on arrival. That is the P77-C defect, in the same file whose comment
warns about exactly it, and I reintroduced it for about ten minutes. Weight now travels as
`--mullion-tabs-tab-weight` the way the colours already do.

**Honest limit:** the tab bar is behind the Admin Panel and needs a signed-in session, so all three
changes are constructed on the established pattern and are **not browser-verified**. R is confirming
on the dev site.

## 4. Your §1 suggestion: swept, and it was the only instance

You suggested the mislabelled formula probably had siblings. I swept the suites for the shape —
arithmetic composing multiple `getComputedStyle` values into a derived quantity reported as
measured. **There were no others.** The four hits are single-value threshold reads
(`parseFloat(cs.outlineWidth) >= 2`, `parseFloat(opacity) < 1`), which are legitimate readings of a
computed property rather than predictions built from inputs. The bad instance lived only in a
throwaway probe.

A negative result, but it was worth the ten minutes, and the new ring test is written the right way
round as a result.

## 5. Not mine, passed to R

Your §3 items — the WordPress.org handle (`astragal`, not `mullion`) and the final asset cut — are
both R's calls rather than mine, and I have put them in front of them rather than letting them sit
in correspondence. The standing rules are likewise waiting on R's archive-before-change instruction
before anything touches `COLOR-SPEC.md`.

---

## 6. Addendum, same day: the rail and the glyphs are in

**Rail: built as you specified, tint retired.** 3px, full row height, leading edge, `primary-stroke`,
on hover and on focus. Both of the tint's exclusions are gone with it, and the guard is now the
stronger property rather than the two conditions: no rule may tint a highlighted row's ground at
all. A mutation that re-adds one fails it.

Verified in a browser the way you would want: the row's computed background is read before and
after highlighting and must be **identical**, plus the rail's painted width and colour off the
`::before`. Not a reach computed from inputs.

One interaction worth naming. On a keyboard move a row carries the rail and the inset ring at once,
since Base UI sets `data-highlighted` on both pointer and arrow keys. They overlap at the leading
edge and are both `primary-stroke`, so it reads as the ring with a heavier leading edge rather than
two marks fighting. That matches your "two states, two marks" only loosely — here one state implies
the other — so if you want the rail suppressed under focus, say so and it is one selector.

**Glyphs: in, on `Alert`, `Button` and `Badge`.** Default for a status tone, an explicit icon wins,
`false` declines. `Badge` has the slot it lacked. The silhouette constraint is a test rather than a
note: the four `d` attributes must be four distinct values, and swapping one for another fails it.

**One scope question I did not widen on my own.** You scoped the glyph to `light` controls and that
is what shipped. A `filled` control carries its role at full chroma, where your own table puts
success against warning at 2.7 under protanopia — weaker than the wash's 0.00, but still under the
threshold where anyone can see a difference. If `filled` should default to a glyph too, it is the
same one-line change in three components. Left alone rather than decided for you.
