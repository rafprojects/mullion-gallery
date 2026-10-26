# The rule, not the number. And the badge split is right — with one line for counts.

**2026-10-26.** Reply to `badges-and-the-scrim-2026-10-26.md`.

The CI row disproving my 0.60 is exactly what the row was for. I said *expect* was the word I kept
being wrong about; thirteen themes is a clean demonstration. Your figures reproduce on the themes I
can check from published palettes — Latte at 0.81, Gruvbox at 0.74, the default at 0.60 — and the
mechanism is clear: **the scrim a theme needs is set by its own text-on-background contrast.**
Latte's is 7:1, the default's is 17:1, and that is the whole difference.

---

## 1. The scrim — derive it per theme, floored at 0.60

**The rule, not the number.** Every other value in this engine that has to hold a contrast
invariant across 23 themes is derived per theme — the halo, `borderStrong`, the tone rungs. A
single constant tuned to the worst bundled theme would be the one place the system does it the
other way, and it would still be wrong for the first user-authored theme with lower contrast than
Latte. The derivation is the same shape as everything else: the smallest opacity at which the
theme's `text` clears 4.5:1 over the worst photo.

**With a floor of 0.60.** Below that a scrim stops reading as a band and starts reading as a
smudge; a caption floating on a barely-there wash looks unfinished even when the numbers pass. So
the resolved value is `max(0.60, derived)`, which on the bundled set runs 0.60 to 0.81. Expose it as
a token — `--mullion-caption-scrim` — so the next caption-over-image uses it without knowing how it
was found, and the audit keeps reading what is drawn.

**On "a band that looks different on every theme":** a user runs one theme. They see Latte's scrim,
never Latte's beside Darcula's. That was the argument for leaving the focus ring's pole flip alone
in September, and it is the same argument here. What a user *does* see is how much of their image
the band covers — and on the ten themes that only need 0.60, a 0.85 band covers a quarter more of
the preview than it has to.

**Muted ink on a scrim: never.** Needing 0.99 is the numbers saying what rule 1 already said — a
rung selected against plain surfaces has no business on a composited one. The counter taking `text`
at its smaller size is right.

**Two notes on the correction.** Good that it was the admin preview and not the visitor lightbox.
The visitor lightbox's caption sits *below* the image on a 93% black backdrop — so its ground is not
the image, it is the backdrop over the page, and that is a plain pair the audit can hold without a
scrim. Make sure it is in there. The visitor lightbox pass stays on the list for after `Select` and
the dialogs.

---

## 2. Badges — the split is right

Seventy-six badges, and most of them were never statuses. The classification is correct and the
proposal follows from it; I would change one line and add one.

**A state takes its tone and its glyph.** Yes. Fifteen sites, and they are the case the glyph exists
for.

**A category, a role or a name is neutral.** Yes, and for the reason you give: every one of them
already carries its word, so the colour was decoration that only some readers got. It was also
spending the colours — "Image" in blue and "Video" in violet teaches a user that blue and violet mean
media types, right up until a blue badge means something else. Neutral badges told apart by their
words give the colours back to the states.

**Counts — your question, and the line I would add.** A count is neutral *unless it is one of two
things*:

- **A count that carries urgency is a state, and takes the state's tone.** "3 pending" is orange
  because *pending* is the state; the 3 is its magnitude. You have already classed it that way. A
  count of grants, views, slots or tags carries no state and stays neutral.
- **A count that annotates a control takes `primary`.** The active-filter count on the filter
  button, a count on a tab — these are not content, they are part of the control they sit on, and
  they tell the user the control is doing something. `primary` is the control colour; that is the
  same distinction as the drag-over hint last round. One or two sites, named rather than inferred.

Everything else that counts is information and stays neutral.

**User colours stay.** A space's colour and a company's brand colour are the user's data, not a
role; the `ColorSwatch` exception applies. Correct.

**Variants stay as they are per site.** The change is to the tone, not the variant: a `dark filled`
file-type badge becomes a neutral filled badge, which is emphasis without a colour claim, and that
is a legitimate thing for a badge to be. Fewer edits, and the review is about colour rather than
shape.

**`dot` → `outline`** as decided. Two of the four were never states, and under this split they
become neutral outlines, which is right.

**The slot-number badge is not a badge rule — it is the overlay rule.** 10px white on a fixed blue,
sitting on a slot that may hold a user's image. That is ink on arbitrary content, the thumbnail
caption's case exactly: `xs`, white, on the black scrim at 0.60. Not a theme tone. Keep it on its
surface's batch, but the rule for it is already written.

---

## 3. The rest

**The fifteen 700s to 600** — stat figures, uppercase section labels, titles — all right. Large
numerals in Inter 600 hold up well; nothing there to revisit.

**`role="alert"` overriding `role="status"`** — a good catch and a quiet one. Two polite
announcements becoming assertive is the kind of defect a screen-reader user feels and a sighted
reviewer never sees. Right to fix it in the framework before anything moves onto it.

**`Alert` under the colour table as written** — yes, alerts are all states.

---

## 4. Where it stands

| | |
|---|---|
| **Caption scrim** | Derive per theme: smallest opacity that clears 4.5:1 over the worst photo, floored at 0.60. One token. Audit reads what is drawn. |
| Muted on a scrim | Never. |
| Visitor lightbox caption | Backdrop-over-page pair into the audit. Whole-lightbox pass after `Select` and the dialogs. |
| **Badges** | Your split. States: tone + glyph. Category / role / name: neutral. Counts: neutral — unless urgent (state) or on a control (`primary`). User colours kept. Variants unchanged. |
| Slot-number badge | Overlay rule: `xs` white on black 0.60. Its surface's batch. |
| 700 → 600 sweep, `Alert` roles | Right. |

Nothing open on my side. Badges can move.
