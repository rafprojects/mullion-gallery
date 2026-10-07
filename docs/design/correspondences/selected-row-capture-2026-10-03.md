# The selected-row capture you asked for, two answers built, and one correction

**From:** engineering
**Date:** 2026-10-03
**Reply to:** `designer-answers-catching-up-2026-10-02.md`

Questions 2, 4 and 5 from your answers are done. Question 1 still waits on the two decisions in
`elevation-followup-2026-10-02.md`, which are the only things blocking the rest of this track.

---

## Question 2: the highlighted-and-selected row

The captures are in `selected-row-capture-2026-10-03/`, at true size (1x, no zoom), on
`default-light` and `default-dark`. In each one "Editor", or "System UI" for the searchable field,
is both selected and highlighted.

| File | What it shows |
|---|---|
| `*-select-pointer.png` | Plain `Select`, highlighted by the pointer: rail and check |
| `*-select-keyboard.png` | Plain `Select`, highlighted by the keyboard: ring and check, no rail (question 5) |
| `*-searchable-keyboard.png` | Searchable `Select`, highlighted by the keyboard: rail and check, because focus stays in the text field |
| `*-menu-pointer.png`, `*-menu-keyboard.png` | A menu row each way, for comparison. Menus have no selected state |

**Measured, the same on both themes:** the rail is 3px on the row's leading edge, and the check
starts 13.9px in, because the row's padding is 12px. So the check sits about 11px clear of the rail
and nothing needed to move. If you want a different gap, say what it should be.

## Question 5: the rail steps aside for the keyboard

Built as you answered. A menu row or a plain `Select` option shows the rail under the pointer and
the inset ring under the keyboard, never both. A searchable `Select`, `MultiSelect` or `TagsInput`
option keeps its rail under the keyboard, as the correction in the last note said it would, because
it never takes focus and the rail is its only keyboard mark. The captures show all three.

## Question 4: a correction to my question

I wrote that the glyph defaulted on `light` controls and asked whether to widen it to `filled`.
That was wrong. Since P80-A the glyph has defaulted on **every** variant, `filled` included. The
default never looked at the variant, and I described what I believed rather than what the code did.
So your "yes" matches what had already shipped, and it is now pinned by a test so it cannot narrow
by accident. On a `filled` control the glyph takes the label's ink, which is black or white,
whichever contrasts more with the fill, so it clears 4.5:1 on every theme by construction.
`confirm()`'s buttons still decline it, because their labels name the action.

## One thing the captures show that you may want to rule on

The popup takes the width of its field, and a label longer than that is cut with an ellipsis:
"Administrator" reads "Administra…" in the plain `Select` captures, where the field is narrow. The
full text is still in the option's accessible name, so a screen reader is unaffected, but a sighted
user cannot read it. Three ways to handle it:

1. **Keep the ellipsis.** It is what the field shows for a long value too.
2. **Wrap long labels** onto a second line inside the row.
3. **Let the popup grow** to fit its longest label, up to a maximum, rather than matching the field.

I would lean to 3, since a list you choose from should be readable in full. It is your call.
