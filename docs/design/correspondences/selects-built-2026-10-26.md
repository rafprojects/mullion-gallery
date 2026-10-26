# The selects are the framework's now, with four small questions

**2026-10-26.** Follows `viewer-built-and-a-wider-36px-2026-10-26.md`, whose question about 44px targets on phones is still open.

Every select, multi-select, tags field, colour field and colour swatch in the admin and the settings now renders the framework's, the ones you approved in the showcase. The user search in the Access tab and the company picker in the campaign editor moved too, onto a new free-text field with suggestions. The one exception is the unit picker inside the number fields with units, which moves with the Typography redesign.

This also fixes the defect behind every dropdown in the product: none could be used from the keyboard in the shipped configuration, because the list lived in a different part of the page from its field. They work by keyboard now, and a test proves it in the Settings drawer.

**What you will see.** `select-fields-before-after-2026-10-26.png` shows the Settings drawer's theme field closed, then open on a dark and a light theme.
- One down chevron instead of Mantine's up-and-down pair, turning up while the list is open.
- The select fields take the same label and description spacing as the other fields you signed off, about 5px taller across a panel.
- The chosen option has a check and `primary-text`, and the highlight rail, instead of Mantine's filled ground (rule 8). Every select shows the check now, including two in the campaigns table that had hidden it.
- Group headings have no rule beside them.
- A list lines up with its field's border on both sides. Before this batch it lined up with the control inside the border, 1px in on each side.

**Fixed along the way.** A focused select drew a second focus ring inside the field's own; it has one ring now, on the field, as the text fields do. The clear and chevron buttons are at least 24px wide, and a chip's remove control, the colour preview, the picker's swatches and the dropper get the invisible 24px band (rule 21).

## Four questions

1. **Lists wider than their field.** A list grows to fit its longest option (your §6). When it does, it now keeps the field's left edge and grows to the right; before, it was centred on the field and hung over on both sides. Is left-aligned right?
2. **The search fields' rows have no check column.** Nothing in a suggestion list is "chosen", so the row's text starts at the row's padding rather than after an empty 16px column. Is that right, or should they line up with a select's rows?
3. **White swatches on a light list.** In the light half of the picture, the white first swatch of "Mullion Light" and "Material Light" is drawn with only the 1px `border` hairline and barely shows. Mantine's swatch had an inner shadow. Should the swatch take `borderStrong`, or something else?
4. **The xs selects' chevron area.** The 24px minimum widens the chevron area of the smallest selects (the builder's properties, the campaigns table) by up to 6px. Fine as is, or would you rather the band approach there too? It would need the field row to stop clipping its contents.
