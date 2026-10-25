# Catching up: three notes that never reached you, and six questions

**From:** engineering
**Date:** 2026-10-02
**Reply to:** `designer-standing-rules-2026-09-14.md`

Your standing-rules reply closed the thread with nothing open between us. After it I wrote three
more notes, `inset-ring-shipped`, `two-open-questions` and `elevation-and-selected-rows`, and none
of them reached you. **This note replaces all three.** Everything in them is below, updated to what
is true today, so those three files can be ignored.

The first section needs no reply. The second is six questions, most important first. The first
two have real decisions in them; the last three are one word each.

---

## 1. What happened after your last reply

**Phase 80 is built.** The input family, the select family, tabs, the segmented control, the
accordion, the checkbox, switch, slider and chips, pagination, the colour picker, and the
notification and confirmation dialogs. Nothing in the product renders any of it yet; Phase 81 moves
the product onto it, with the visual refresh R agreed with you.

**Your §1 suggestion: swept, and it was the only instance.** I looked for every assertion that
composes several computed values into a derived quantity and reports it as measured. There were no
others. The four hits were single-value threshold reads, such as `outlineWidth >= 2`, which are
legitimate readings rather than predictions.

**Your §2 standing rules are not in `COLOR-SPEC.md` yet.** They are waiting on R's
archive-before-change instruction, as you said they would be. I have put it in front of R.

**Your §3.1: the WordPress.org account is `astragal`.** Registered 2026-09-09, and `readme.txt`
names it as the contributor. You can stop raising it.

**Your §3.2, the final asset cut, is R's to answer.** I have asked them to reply to you directly.

**The inset ring shipped**, gated to neutral and washed grounds by rule 8, with one deliberate
change to your snippet; see question 6.

**The rail and the glyphs are in.** The rail is 3px, full row height, on the leading edge, in
`primary-stroke`, on hover and on focus, and the menu's highlight tint is retired. The guard is the
stronger property rather than the old two exclusions: no rule may tint a highlighted row's ground at
all. The glyphs default on `Alert`, `Button` and `Badge` for a status tone; an explicit icon wins and
`false` declines.

**The tab bar's three changes are in**, and R confirmed them on the live site. One trap worth
knowing about: Mantine sets the tab's weight as an inline style, which outranks any sheet, so the
weight travels as a custom property the way the colours already do.

---

## 2. Six questions

### 1. The elevation ladder has at most two usable rungs on every theme, and one on most

I needed a raised pill for the segmented control's indicator, sitting on a recessed track: track on
`surface2`, indicator on `surfaceRaised`. Measured across all 23 bundled themes, that indicator
would have been invisible on 21 of them.

`surfaceRaised` is **identical** to `surface2` on 21 of 23 themes: CIEDE2000 0.00, contrast 1.00:1.
On the two exceptions, the default themes, the gap that closes is the one below it instead.

| Theme | background to surface | surface to surface2 | surface2 to surfaceRaised |
|---|---|---|---|
| default-light | 2.80 | **0.75** | 1.20 |
| default-dark | 6.00 | **1.61** | 3.51 |
| every other theme | 1.00 to 8.76 | 1.31 to 11.38 | **0.00** |

So no bundled theme has three distinguishable surface rungs. A menu on `surfaceRaised` over a panel
on `surface2` is one colour on most themes, and so is a card on a section ground. Every one of those
reads as flat and is held together by a border.

In the meantime the indicator carries a 1px `border-strong` border, which the engine already audits
and which clears 3:1 against `surface2` on all 23 themes. The toast in question 3 does the same.
That works and it is measured, but it is a border doing an elevation's job, and two components now
depend on it.

**The question:** is the collapsed ladder deliberate, or is it a consequence of how the rungs are
derived that nobody has looked at? If it should have three real rungs, that is a change to the
engine's derivation and it moves colours you have signed off, so it is your call and not a small
one. If two is the intent, say so and I will write it down where the next person will find it and
stop treating the third as available.

A related measurement from the same work: `primaryStroke` is set equal to `primaryFill` whenever the
fill already clears 3:1, which is 10 of 23 themes, and `primaryStroke` on `primaryFill` clears 3:1 on
exactly one (darcula, 3.96). So the ring and rail colour cannot mark anything on top of a filled
control on any theme but one. That is what forced question 2.

### 2. A selected option in a dropdown is no longer filled

**Before:** Mantine paints the selected row with `primaryFill` and `primaryOnFill`, edge to edge.

**Now:** a check at the leading edge and the label in `primary-text`. The row's ground does not move,
and the highlighted row keeps your rail.

**Why, and it is your rule rather than my preference.** Rule 8 says a filled control flush with its
container is a layout defect, and a row inside a scrolling popup is exactly that. The measurement
above closes the other door: the rail on a filled row would be 1.00:1 on 10 themes, so a selected
row could not show which row the keyboard is on. `primary-text` on `menu-bg` clears 4.5:1 on all 23
themes (worst 4.54, solarized-dark), and the check means selection never rests on colour alone.

**The question:** is this the right read, or does the fill matter enough to give the list 6px of
inline padding, so the fill sits clear of the popup edge and the outset ring has room? That route
satisfies rule 8 too; it just changes the look in a different direction.

### 3. A component you have not seen: the toast

Phase 80 built the notification toast from scratch, and nobody has designed it. What it does now:

- A plain column of toasts, newest nearest the screen edge, 22rem wide. Not an overlapping deck:
  a deck puts the second toast behind the first at partial opacity, which is a contrast measurement
  nobody has taken.
- `surface` ground, 1px `border-strong` border and the large shadow. The border is there because of
  question 1.
- The role glyph leading, as on `Alert`.
- **A 4px leading edge in the role's text colour** on success, warning, danger, info and primary
  toasts.

That last one is the question. Rule 5 says a role-coloured rail, border or dot is still colour and
fails as a signal. Here the edge is not the signal: the glyph is, and the edge sits beside it as a
redundant cue. But you rejected a role-coloured rail as the signal, and you may also mean that the
toast should not carry one at all. **Keep the edge as decoration, or drop it so the glyph is the
toast's only status mark?**

The confirmation dialog is the framework's own modal with a title, the body, and two buttons
end-aligned: cancel first, then the confirm button filled in the tone the caller asks for (danger for
a delete). The confirm button declines the glyph because its label names the action. Nothing to
decide there unless you see something; it is listed so you have seen it before users do.

### 4. Should a `filled` control default to the role glyph too?

The glyph defaults on `light` controls, as you scoped it. Your own table measures success against
warning at full chroma as 2.7 under protanopia, which is better than the wash's 0.00 and still below
what anyone can tell apart side by side. A `filled` control carries its role at exactly that chroma.
Against widening it: a `filled` control is louder already, and you scoped it deliberately. Same
one-line change in `Alert`, `Button` and `Badge` either way. **Yes or no?**

### 5. Should the rail be suppressed under keyboard focus?

Base UI sets the highlighted state on both pointer and arrow keys, so every keyboard-focused row is
also a highlighted row and carries the rail and the inset ring together. They overlap at the leading
edge in the same colour, so it reads as the ring with a heavier leading edge. That is only loosely
your "two states, two marks". **Leave it, or suppress the rail under focus** so the ring marks the
keyboard and the rail marks the pointer and the two never co-occur? I would not recommend the third
option, dropping the ring under highlight: the ring is the audited keyboard indicator and the rail is
not.

### 6. The inset ring's band order

You wrote core, halo, core reading inward. I built halo, core, halo, because the outset ring read
outward is halo, core, halo, and the inward mirror of it is what "reads as the same indicator" asks
for. It also keeps the halo against the neighbouring row, which is the job the outer band does on the
outset ring. **If core-first was deliberate, say so and it flips.**

---

## 3. Where things stand

| | |
|---|---|
| Focus ring geometry | Signed off, 2/2/2, reach 6px. |
| Inset variant | Shipped, gated by rule 8. Band order open (question 6). |
| Tone signal | Glyphs shipped on `light` controls. `filled` open (question 4). |
| Menu row | Rail shipped, tint retired. Rail under focus open (question 5). |
| Selected dropdown row | Check and `primary-text`, no fill. Open (question 2). |
| Elevation | Two rungs at most on every theme. Open (question 1). |
| Toast | Built, undesigned. Open (question 3). |
| Palette | Unchanged since 2026-09-09. |

Questions 2 to 6 are one-line changes each and land in Phase 80's last framework track as you answer
them. Question 1 is an engine change and would land at the start of Phase 81, ahead of the refresh.
