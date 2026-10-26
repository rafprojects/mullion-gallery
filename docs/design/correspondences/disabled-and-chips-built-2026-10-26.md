# Disabled is recessed and the chips have moved: the filter row, before and after

**2026-10-26.** Follows `designer-answers-controls-2026-10-26.md`.

Both of your answers are built, and both are in `COLOR-SPEC.md` as standing rules: the disabled control is rule 16 and the checked selection mark, with your chip table, is rule 17. Restore stays `primary`.

## 1. Disabled

Every framework button and icon button now draws a disabled state as `background` ground, `border` edge and `borderStrong` ink, with no opacity, in every variant and tone. A browser test reads the three colours off a disabled filled button and a disabled subtle danger icon button on both defaults and checks each against its token, and that opacity is 1. `disabled-button-recessed-2026-10-26.png` is the settings drawer's header after the change, light above dark; the before is the pair you already have.

A loading button is disabled underneath (it cannot be pressed twice) but keeps its own look, since it is busy rather than unavailable.

On focus: a disabled framework button, icon button or chip is disabled with the native attribute, which takes it out of the tab order, and no call site disables a button rendered as a link (which the attribute would not reach). One near miss is noted for later. The campaign editor's media picker fades a tile already in the campaign to 50% opacity. It is out of the tab order, but it is a disabled state drawn with opacity. It is a photo tile rather than a control, so I have not given it the recessed treatment by default; it comes to you with the media picker's batch.

## 2. Chips

`chip-filter-row-2026-10-26.png` is the gallery's filter row in all six photographed themes, Mantine on the left and the framework on the right, at twice size. Your table, applied:

- unchecked is `surface`, `border` and `text`;
- checked is the primary wash, a `primaryStroke` edge, `text`, and the check mark;
- hover moves only the edge, to `borderStrong`;
- keyboard focus is the inset ring.

The geometry is Mantine's: 28px tall at the gallery's size, and a checked chip gives up half its side padding to the check, so selecting one does not shift the row. A browser test checks the colours, the 28px height, that a chip is the same width checked and unchecked, the check mark, the hover edge and the inset ring on both defaults.

**Two things to look at in the strip.**

- **The check reads lighter than Mantine's.** Theirs was toned and heavier. Yours carries no tone, as you asked, and at the success glyph's stroke it is 1.5px wide at the chip's 12px icon size. It is legible on every theme in the strip, but it is a quieter mark than the one visitors see today. If you want it heavier, the stroke is one number.
- **Hovering a checked chip replaces its `primaryStroke` edge with `borderStrong`**, because the table's hover row says "either". The wash and the check stay, so the chip still reads as checked. I built it as written; say if hover should leave a checked chip's edge alone.

**The same look went to two more rows** besides the gallery's and the isotope adapter's, because they are the same control: the admin panel's category filter (Mantine's `light`) and the space asset library's tag filter (`outline`, where several tags can be chosen at once). No call site can choose a variant any more.
