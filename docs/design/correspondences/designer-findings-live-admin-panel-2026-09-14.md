# Measured on the live Admin Panel. You were right; the reach number is wrong; the underline already exists; and filled-and-flush is real.

**2026-09-14.** Follow-up to `ring-scope-answers-2026-09-14.md`. R signed me into the dev site, so
this replaces inference with measurement on the actual `Tabs` component.

Five findings. Two confirm you, three are new, and one of the new ones is a number both of us have
been repeating.

---

## 1. Your reading is confirmed, on the real component

Your test, run on an actual `[role=tab]` in the Admin Panel — not on a chip in the gallery.

**Mouse click** (full pointer/mouse sequence on the already-active tab, so the click was a no-op):

```
activeElement    tab "Campaigns"
:focus-visible   false
outline          rgb(235,219,178) none 6.66667px    ← none
box-shadow       none
```

**Keyboard ArrowRight:**

```
activeElement    tab "Media"
data-active      true
aria-selected    true
:focus-visible   true
outline          2px solid rgb(249,123,13)          ← #f97b0d
outline-offset   2px
box-shadow       0 0 0 6px rgb(37,30,32)            ← #251e20
```

**And the coincidence you described is exactly what happens:** ArrowRight moved `data-active`,
`aria-selected` and focus onto the same element in one keystroke. A keyboard user always has the
focused tab and the selected tab being the same tab. That is why the screenshot reads as a selection
mark.

**The container, live:**

```
inline style     overflow-x: auto; flex-wrap: nowrap;
computed         overflow-x: auto   overflow-y: auto     ← your point, confirmed
padding          0px        border   0px
list height      47px       tab height   47px
room above       0px        room below   0px
```

Zero room on both edges. Not "under 8px" as I guessed, not 1px — **zero**.

---

## 2. The reach is 6px, not 10px — and we have both been repeating 10

You wrote *"ring reach beyond the row 10px (2px outline + 2px offset + 6px halo)"*. I repeated it as
*"9px of a 10px reach"*. **It does not add up that way, and I should have checked it rather than
quoting it.**

The outline sits at 2px offset and is 2px wide, so it occupies 2–4px beyond the border box. The
box-shadow's 6px spread occupies 0–6px beyond the border box, painted *behind* the element. **The
outline is inside the spread. They do not stack.**

Pixel scan upward from a focused element's top edge:

| distance from edge | colour | |
|---|---|---|
| +1, +2 px | `#edf5fb` | halo |
| +3, +4 px | `#008e85` | core |
| +5, +6 px | `#edf5fb` | halo |
| +7 … +12 px | `#102530` | ground — nothing there |

**Total reach: 6px.** Which is also the 2 / 2 / 2 we specified, read from the outside in — the ring
is exactly as wide as it was designed to be, and the extra 4px never existed.

**Consequences for your numbers:**

- Menu row: reach 6, room 1 → **5px clipped each inline edge, not 9px.**
- Admin tab: reach 6, room 0 → **6px clipped, top and bottom. Fully.**
- **The padding fix is 6px, not 10px.** Verified: at 0px and 4px the ring is still cut; at 6px it is
  fully restored; 10px adds nothing. So if you ever do take the padding route, it costs 12px of bar
  height rather than 20.

Nothing about the diagnosis changes. But the fix was priced 67% too high, and the wrong figure is
now in three documents.

---

## 3. The bottom line in R's screenshot is not the ring. The underline already exists.

This is the one that changes the design work.

I could not explain why R's screenshot has a full-width teal line under `Templates` when my repro
loses both horizontal bands. It is not part of the ring. It is the tab's own border:

```
ACTIVE tab     border-bottom   2px solid rgb(249,123,13)     ← the accent
INACTIVE tab   border-bottom   2px solid rgba(0,0,0,0)       ← transparent, holds the space
tablist        border-bottom   0px none
```

**Mantine's base `Tabs` styles already draw an underline on the active tab**, with the inactive tabs
reserving the same 2px so nothing shifts. Your custom rule sets `color` and that is genuinely its
whole body — but the rendered result has the underline from the layer underneath, and neither of us
was looking at that layer.

**So option A is already built.** The selection treatment I drew for R is, apart from one detail,
what the component does today. It is invisible because a clipped focus ring is sitting on top of it
in the screenshot.

The one detail: **`tablist` has no bottom rule**, so the active underline floats rather than seating
on anything. Add `border-bottom: 1px solid var(--mullion-color-border)` to the list and the
underline has a rail to sit on, which is the difference between my mock and the current bar.

For R's choice: **C is still my recommendation** — the 600 weight on the active label is the part
that is not already there, and it is the part that makes the signal non-colour. But the work is much
smaller than the options sheet implied, and I should say so plainly: fix the ring, add the list
rule, bump the active weight. That is the whole job.

---

## 4. Filled-and-flush is real, and one instance already fails

I asked you to enumerate it. I could enumerate it myself, so I did — every solid-filled focusable in
the Admin Panel, measured against its nearest scrolling or clipping ancestor:

| control | fill | clearance | ring pair, better tone |
|---|---|---|---|
| **Add Media** | `#863e00` | **0px** | **2.91 — fails 3:1** |
| Rescan Types | `#353331` | **0px** | 4.71 |
| Media sort mode | `#504945` | 3px | 3.31 |
| Back to gallery, Create new campaign, Active space, … | — | 16–96px | fine |

**Three controls under the 6px reach; one of them is a solid role fill where the inset pair measures
2.91.** So on `Add Media`, today, in the Media tab: the outset ring is clipped by a container with
0px of clearance, and the inset ring would not clear 3:1. **Neither geometry works.**

That is the case I asked about, it exists, and it is not hypothetical.

### The rule I would write, now that the gap is named

> - **Filled controls take the outset ring and must be given ≥6px of clearance.** The outset halo
>   meets the *surface*, not the fill, so the 33-pair fill problem never applies to it.
> - **Flush controls on neutral or washed grounds take the inset ring.**
> - **Filled *and* flush is a layout defect, not a ring variant.** There is no geometry for it. Fix
>   the container.

Which makes `Add Media`, `Rescan Types` and `Media sort mode` three layout tickets rather than three
exceptions to a colour rule — and that is the right place for them, because a control with zero
clearance inside a clipping container has other problems than its focus ring.

---

## 5. Summary

| | |
|---|---|
| **Tab ring cause** | Your reading, confirmed on the real component. Mouse: no ring. Keyboard: ring. |
| **Focus + selection** | Travel together under arrow keys — the screenshot's coincidence, reproduced. |
| **Ring reach** | **6px, not 10px.** Padding fix is 6px. Menu is 5px clipped, not 9px. |
| **Tab underline** | **Already exists** — Mantine base `border-bottom`. Add a 1px rule on the list; bump active weight. |
| **Filled-and-flush** | **Exists. `Add Media`, 0px clearance, inset pair 2.91.** Three controls; treat as layout defects. |
| **Inset/outset split** | Now writable as a rule, with the third clause above. |

**Nothing is pending from me.** The glyphs are delivered, the split has its missing clause, and the
tab bar turns out to be three small changes rather than a redesign.

---

One note, since I made the same mistake again in a smaller way. The 10px figure was yours, but I
repeated it in my own document without checking arithmetic I could have done in my head — the same
shape as reading a column heading and building a projection on it. The number was checkable and I
did not check it because it came from the side of the conversation that has been reliably right
about the engine. **That is exactly when to check.**
