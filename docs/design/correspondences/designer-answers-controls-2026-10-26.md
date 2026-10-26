# Disabled is recessed, chips keep their check, Restore is an action

**2026-10-26.** Reply to `controls-moved-2026-10-26.md`.

**On the spec copy: nothing was lost.** I have not edited the `COLOR-SPEC.md` in this folder since
you took over maintaining it; everything I have changed went through a dated letter and you applied
it. The archive-before-change habit is for the repo copy, which is the one that matters. Carry on
copying it here. And 14 → 15 for the caption rule is fine; the earlier letters can stay as written.

The drift you found in the controls — icon buttons at input heights, narrow padding, `sm` corners,
500 labels — is the kind of thing that only surfaces when someone reads the stylesheet being
replaced rather than the one replacing it. Good that it was measured back before the flip.

---

## 1. Restore is `primary`

An action the user takes, not an outcome reported to them. `primary` is right, and in the
bulk-actions bar it pairs correctly against a `danger` Delete. `success` would say "this already
went well," which is not what a button says.

---

## 2. Disabled — neutral, and specifically: recessed one rung

Your crops settle the question. On the light theme the faded button is a pale but unmistakably
*live* primary with white text — it says "click me" slightly more quietly, which is the opposite of
what a disabled Save has to say. Opacity also makes the button a composite of itself and whatever is
behind it, so its appearance depends on the ground — the same objection as every unaudited pairing
this engagement has retired.

**A disabled control is the same thing in every variant and every tone, built from three tokens
that already exist:**

| | token | why |
|---|---|---|
| ground | **`background`** | one rung *down* — the inverse of raised. A disabled thing sits lower than the surface it is on. |
| edge | **`border`** | rule 14 guarantees it is visible against every ground, so the control keeps its shape wherever it sits |
| ink | **`borderStrong`** | the neutral that is already derived to clear 3:1 against the surfaces — readable, and visibly under the text floor |

Measured on the two defaults:

| | ground vs its surface | edge vs ground | ink on ground |
|---|---|---|---|
| default-dark | ΔE00 6.00 | ΔE00 14.68 | **4.50** |
| default-light | ΔE00 2.80 | ΔE00 6.20 | **3.12** |

The ink lands in the right band on both — readable, and clearly not the 4.5 that live text gets, so
it looks *off* rather than merely grey. On light the recessed ground is a quiet step and the edge
carries the shape, which is rule 13's light half doing its job a third time. No new token, no
opacity, no dependence on what is behind the button.

**Why not `textMuted` for the ink:** it is 8.63:1 on dark and 4.64 on light, which is ordinary
secondary text. A disabled label that reads like a caption does not read as disabled.

**And it must not be focusable.** A disabled control takes no focus ring because it takes no focus;
if any disabled button in the product is still in the tab order, that is the bug to fix, not a ring
to style.

---

## 3. Chips — one look, and the check stays

**The check mark stays on a checked chip.** It is the non-colour signal for "selected," and the
gallery's filter row is a surface visitors see. A checked chip that differs from an unchecked one
only by a tinted wash is a colour-only state, and this engagement measured what that costs in
September. The check is a generic selection mark — draw it with the same stroke as the success
glyph for consistency, but it carries no tone.

**One look is enough, and it is the `light` one.** The two filter rows — the gallery's and the
isotope adapter's — are the same control doing the same job, and a `filled` chip that is solid
primary when checked is a louder way of saying the thing the wash and the check already say. One
look gives one audit and one thing to explain.

Specified, so it moves in one batch:

| state | ground | edge | ink | leading |
|---|---|---|---|---|
| unchecked | `surface` | `border` | `text` | — |
| **checked** | the primary **tone-wash** (P79-C: the ground is tinted, so the ink is not) | `primaryStroke` | `text` | **check** |
| hover, either | ground unchanged | `borderStrong` | `text` | as above |
| keyboard focus | the inset ring, as every flush control | | | |

Height stays where Mantine's is, 28–29px at the gallery's size. The checked chip's ink is `text`,
not `primary-text`, because the ground is already carrying the tone and the wash was audited on
exactly that basis. The adapter's `filled` rows take the same look.

**Send the before-and-after of the gallery's filter row when it moves.** That one I want to see, for
the same reason it is the row you held back.

---

## 4. Where it stands

| | |
|---|---|
| Restore | `primary`. |
| **Disabled** | Recessed: `background` ground, `border` edge, `borderStrong` ink. Same everywhere. Never focusable. |
| **Chips** | One look, `light`. Check stays. Table above. Capture the gallery row. |
| Spec copy | Nothing lost. |

Nothing open on my side.
