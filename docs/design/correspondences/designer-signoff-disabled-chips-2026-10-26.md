# Both approved. Two adjustments to the chip — the check gets heavier, and hover on a checked chip adds rather than subtracts.

**2026-10-26.** Reply to `disabled-and-chips-built-2026-10-26.md`.

---

## 1. Disabled — approved as built

The crop says it: on both themes the recessed Save reads as *off*, beside a Cancel that reads as
live. The test reading three tokens and `opacity: 1` off a disabled filled button and a disabled
subtle danger icon button is the right assertion — it checks the rule, not a screenshot. A loading
button keeping its own look is correct; busy is not unavailable.

**The media-picker tile at 50%** is the right thing to defer, and when its batch comes the answer
will not be the recessed treatment either. It is a photo, so "already in the campaign" wants a
non-colour mark — a check or an "Added" label on a scrim — rather than a fade, for the same reason
the thumbnail caption got a scrim: opacity on an image is a composite nobody audited. Note it for
that batch.

## 2. Chips — approved, with two changes

The strip is what I wanted to see. On all six themes the checked chip reads as checked, and the
edge in `primaryStroke` turns out to be the strongest of the three signals — which is fine, as long
as the check is strong enough to carry the state on its own for a reader who cannot see the edge's
colour. That is the first change.

**The check goes to 2px.** At 1.5px it is legible on every theme in the strip, and it is also the
quietest thing on the chip, which is backwards for the one signal that has to survive colour-vision
deficiency. The success glyph's stroke was tuned for a badge sitting beside a word; on the chip the
check *is* the word. Draw the selection check at a 2px stroke at the chip's 12px icon size — stroke
4 on the 24 grid — and it stops being the thing a reader has to look for.

**Hover on a checked chip strengthens the wash; the edge stays `primaryStroke`.** You built "either"
as written and the result subtracts: hovering a checked chip swaps its coloured edge for a neutral
one, so the chip's strongest checked signal weakens exactly when the user is looking at it. Hover
should add. The `light` Button already has the right hover for a tinted ground — the wash steps from
14% to 20% — and a checked chip is the same construction, so it takes the same hover:

| state | ground | edge |
|---|---|---|
| unchecked, hover | `surface` | `border` → `borderStrong` |
| **checked, hover** | **wash → wash-strong** | **`primaryStroke`, unchanged** |

Ink stays `text` in both — P79-C holds on wash-strong with plain text, which is what the September
audit established. One condition in the sheet, and both states now have a hover that reads as more,
not less.

**Everything else stands.** The width holding across check and uncheck is the detail I would have
asked about next; good that it is tested. And collapsing the admin category filter and the asset
library's tag filter onto the same look — with no call site able to pick a variant — is the whole
point of a chip being one thing.

## 3. Where it stands

| | |
|---|---|
| Disabled | Approved. Rule 16. |
| Chips | Approved with two changes: 2px check; checked-hover is wash-strong with the edge kept. Rule 17 to match. |
| Media-picker tile | Deferred to its batch; it wants a mark on a scrim, not a fade. |

Nothing open on my side.
