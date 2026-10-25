# Scale mapping, round two: 6 earns a rung, the rename gets a prop, and the 9px caption was never a size problem

**2026-10-25, later.** Reply to `ui-scale-mapping-data-2026-10-25.md`.

Thank you for measuring the size basis rather than reasoning about it. Three decisions below, one
of which is a priority call rather than a design one.

---

## 1. The size basis — this is a shipping defect, not a sequencing item

Your measurement puts it beyond argument: on a 62.5% root, `lg` renders at 12.5px, `md` at 10px,
`xs` at 6.25px. **Every Mullion install on a theme that sets its root that way is today showing the
gallery at 62.5% of its design size** — focus ring, glyphs, touch targets, all of it. That is true
before any migration and independent of it.

Filing the invariant as its own Phase 81 track is right. I would go one step further: **it is a
defect in the shipped product, and it should carry a defect's priority, not a refactor's.** It is
also one of the few things in this engagement where the fix cannot move a colour, so it is cheap to
ship ahead of everything else in P81.

---

## 2. Question A — six gets a rung. Three rungs below `xs`, not two, not four.

The histogram settles it. Your surprise is the right one: 36 sites at 6px is not noise, it is a
step the scale was missing. 4px is *inside a control* — icon to label. 6px is *between related
controls* — chip to chip, button to button in a row. Those are different jobs, and 27 of the 36
are `Group`, which is exactly where "between related controls" lives.

**The values below `xs` are 2, 4 and 6. Eight is not a rung** — it is 2px from `xs` at 10, too close
to read as a step, and only four sites use it. They go to `xs`.

| number | sites | becomes | review? |
|---|---|---|---|
| 0 | 9 | `0` | no — a touching stack is a legitimate stack |
| 2 | 16 | **`4xs`** (2px) | no |
| 3 | 2 | **`3xs`** (4px) | yes — one control, two files, one decision |
| 4 | 69 | **`3xs`** (4px) | no |
| 6 | 36 | **`2xs`** (6px) | no |
| 8 | 4 | `xs` (10px) | yes — 2px looser |

**130 of 136 move mechanically; 6 go to review.** And the scale's bottom becomes
2 · 4 · 6 · 10 · 12 · 16 · 20 · 32 — Tailwind's bottom half under Mantine's top half, monotonic, every
step at least 2px. It is not elegant, but it is honest about what the product uses, and the
alternative — changing `xs` — would move every token-based gap in the product, which is the
cascade we spent October learning not to cause.

On the names: `4xs`, `3xs`, `2xs` are ugly and systematic, and systematic wins. They sort
correctly, they say where they sit, and nobody has to remember whether `tight` is bigger than
`snug`. If the framework later wants semantic aliases, they can point at these.

**Keep 2 as its own rung** rather than folding it into 4. A 2px gap is a hairline — segmented
buttons, icon buttons that should read as one group. At 4 they separate. Sixteen sites is enough
to be a pattern.

---

## 3. Question B — the prop, now; the component when the second site arrives

**Add `bare` to the framework field.** It is the primitive — drops the box, keeps the focus ring and
the typography — and it is one addition. You are right that the Typography redesign in P81-B is
likely to want it.

But an inline-edit field is more than a borderless input, and the title-bar rename needs the rest
of the pattern even as the only site. **Specify these three states on the `bare` field, and the one
site gets them for free:**

| state | treatment |
|---|---|
| rest | reads as the text it is — the title at `lg`, bold, no box, no affordance |
| hover | ground washes to `surface2` with the field's radius; cursor `text`. The ink does not change — that is P79-C. |
| focus | the inset ring, ground stays on the wash |

That uses tokens that already exist and introduces no colour. The hover wash is what tells a user
the title is editable, and without it a bare field is a title that mysteriously accepts clicks.

**Do not build an `EditableText` component for one site.** When P81-B produces the second inline
edit, that is the moment to extract the component from the two uses — it will be the states above
plus whatever both sites turned out to share. Naming the pattern now is enough to recognise it then.

**`UnitScrubField` → the number field's unit slot.** Correct, and it was never a variant question.
Good catch on `ColorInput`.

---

## 4. The five sub-token sites — four floor cleanly, and the fifth was a contrast defect wearing a font size

**The three affixes — `W`, `H`, `°` — floor to `xs` and take `tone="muted"`.** Your instinct is
right: at 12px they match the value beside them, and that is the correct reading for an adornment.
The 10px was doing the job of "secondary"; muted ink does that job properly, and the size stops
being the signal.

**The file name under the thumbnail floors to `xs`.** It is metadata, it is already truncated, the
full name is in `title`. If 12px truncates visibly more in a fixed tile, the tile is a few pixels
too narrow; the text is not too big.

**The 9px white title over the media thumbnail.** This one I want to be plain about, because the
font size was never the problem. **White text overlaid directly on an arbitrary photo is unaudited
ink on an unknown ground** — rule 1, verbatim. Over a light image it is unreadable at any size;
the 9px is someone trying to fit a title into a tile that had no room for one. Flooring it to 12
without fixing the ground just makes a larger unreadable caption.

**The fix is a scrim, and it is a checkable one.** Put the caption on a bottom gradient from
transparent to black, and the question becomes *what opacity guarantees AA over the worst image*,
which is a white one:

| scrim at the caption line | ground over a white image | white text |
|---|---|---|
| `rgba(0,0,0,0.50)` | `#808080` | 3.95 — fails |
| `rgba(0,0,0,0.55)` | `#737373` | 4.74 |
| **`rgba(0,0,0,0.60)`** | **`#666666`** | **5.74** |
| `rgba(0,0,0,0.70)` | `#4d4d4d` | 8.45 |

**Sixty percent.** Over any darker image the ground is darker and the ratio only rises, so 0.60 at
the caption's baseline is a floor that holds for every image a user can upload — which is the
property the standing rules ask for and the one the current 9px caption does not have. Caption at
`xs`, white, one line, truncated, on a scrim that reaches 0.60 by the caption line. If one line at
12px loses too much of the title, the tile grows by a line; the text does not shrink.

That is the second time this engagement a tiny font size turned out to be a contrast defect that
somebody had squeezed instead of fixed. Worth a line in the review notes for pass 2: **a size
below the smallest token is a flag for an unaudited ground, not a size to preserve.**

---

## 5. Where it stands

| | |
|---|---|
| **Size basis** | Shipping defect, measured. Carry it as one. |
| **Rungs below `xs`** | `4xs` 2 · `3xs` 4 · `2xs` 6. Eight folds into `xs`. 130 mechanical, 6 review. |
| **`bare` field** | Add it, with the rest / hover / focus states specified above. Component later. |
| **Unit picker** | Onto the unit slot. |
| **Affixes** | `xs`, `tone="muted"`. |
| **File name** | `xs`. |
| **Thumbnail caption** | `xs`, white, on a scrim reaching `rgba(0,0,0,0.60)` at the caption line. |

Nothing open on my side. Pass 2 on `Stack` and `Group` can be written from the table in §2.
