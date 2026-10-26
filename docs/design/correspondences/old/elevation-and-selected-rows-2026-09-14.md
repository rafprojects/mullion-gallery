# Two things from the selection and choice controls

**From:** engineering
**Date:** 2026-09-14
**Context:** Phase 80-B, the select family, tabs, the segmented control, the accordion, the
checkbox, switch, slider and chip group, plus pagination and the colour picker. All built,
none of it consumed by the product yet, so everything below is still cheap to change.

Two items need you. The first is a palette finding rather than a component one and it is the
more important of the two. The second is a visible change I made by applying your standing
rule 8, and you should see it before Phase 81 puts it in front of users.

---

## 1. The elevation ladder has at most two usable rungs on every theme, and one on most

I needed a raised pill for the segmented control's indicator, sitting on a recessed track. The
obvious construction is a step up the surface ladder: track on `surface2`, indicator on
`surfaceRaised`. Measured across all 23 bundled themes, that indicator would have been
invisible on 21 of them.

`surfaceRaised` is **identical** to `surface2` on 21 of 23 themes: CIEDE2000 of 0.00, contrast
ratio 1.00:1. Not close. The same colour.

The two exceptions are the two default themes, and on those the gap that closes is the one
below it instead:

| Theme | background to surface | surface to surface2 | surface2 to surfaceRaised |
|---|---|---|---|
| default-light | 2.80 | **0.75** | 1.20 |
| default-dark | 6.00 | **1.61** | 3.51 |
| every other theme | 1.00 to 8.76 | 1.31 to 11.38 | **0.00** |

So **no bundled theme has three distinguishable surface rungs**. Each has two at most, and 21
of them have `surface2` and `surfaceRaised` collapsed into one.

**Why this is worth your time rather than mine.** It is not a bug I can fix in a component. It
is the shape of the palette, and it decides what any raised or recessed surface can look like
across the whole framework: a menu on `surfaceRaised` over a panel on `surface2` is one colour
on most themes, and so is a card on a section ground, and so was this indicator. Every one of
those currently reads as flat and is held together by a border.

**What I did in the meantime.** The indicator carries a 1px border in `border-strong`, which
the engine already audits and which clears 3:1 against `surface2` on all 23 themes. That works
and it is measured, but it is a border doing an elevation's job, and if the answer is that the
ladder should have real rungs then several components should be revisited together rather than
each growing its own border.

**What I am asking.** Is the collapsed ladder deliberate, or is it a consequence of how the
rungs are derived that nobody has looked at? If it should have three real rungs, that is a
change to the engine's derivation and it affects colours you have already signed off, so it is
your call and not a small one. If two rungs is the intent, say so and I will stop treating the
third as available and write that down where the next person will find it.

A related measurement from the same batch, for the same reason: `primaryStroke` is set equal to
`primaryFill` whenever the fill already clears 3:1, which is **10 of 23** themes, and
`primaryStroke` on `primaryFill` clears 3:1 on exactly **1** of 23 (darcula, 3.96). So the ring
and rail colour cannot be used as a mark on top of a filled control on any theme but one. That
is what forced item 2.

---

## 2. A selected option in a dropdown is no longer filled

**What it looked like.** Mantine paints the selected row in a dropdown with `primaryFill` and
`primaryOnFill`, edge to edge. The tokens for it exist and are audited.

**What it looks like now.** A check mark at the leading edge, and the label in `primary-text`.
The row's ground does not move. The highlighted row keeps the leading rail you specified for
the menu in the last round.

**Why I changed it, and it is your rule rather than my preference.** Standing rule 8 says a
filled control flush with its container is a layout defect, and a row inside a scrolling popup
is exactly that. Then the measurement above closes the other door: the highlight rail on a
filled row would be 1.00:1 on 10 themes and clears 3:1 on one, so a selected row could not
carry the highlight mark at all. Filling the row means either breaking rule 8 or losing the
ability to show which row the keyboard is on.

**What the replacement measures.** `primary-text` on `menu-bg` clears 4.5:1 on **all 23**
themes, worst 4.54 on solarized-dark. It needs no new audit because `menu-bg` derives from
`surfaceRaised`, which is already one of the four grounds the text rungs are selected against.
The check is the primary mark and the colour is the second, so selection never rests on colour
alone.

**What I would like from you.** Confirm this is the right read, or tell me the fill matters
enough to give the list 6px of inline padding so the fill sits clear of the popup edge and the
outset ring has room. That second route satisfies rule 8 too; it just changes the look in a
different direction, since the selected row would no longer run edge to edge. I picked the
first because it reuses the vocabulary the menu already has.

---

## Still open from the last round

`two-open-questions-2026-09-14.md` is still waiting on you. Neither blocks anything:

1. Should a `filled` control carry the role glyph by default, as `light` now does?
2. Should the menu's leading rail be suppressed while the row also shows the focus ring?

No rush on either. The two items above are the ones with a decision in them.
