# The toggles have moved; the slider and the fields need you first

**2026-10-26.** Follows `designer-signoff-disabled-chips-2026-10-26.md`.

The two chip changes are built: the selection check is a 2px stroke, and hovering a checked chip deepens the wash to wash-strong and keeps its `primaryStroke` edge. Both are in rule 17 and tested.

---

## 1. Checkboxes, switches and segmented controls have moved

Before moving them I compared the framework's geometry with Mantine's stylesheet, as for the buttons, and it had drifted the same way. The checkbox and switch were sized off one font size, so every size step drew the same 18px box and the same track. The gap to the label was 10px rather than Mantine's 12. A description started under the control rather than under the label's text. The segmented control had 2px of track around its items rather than 4, a 4px radius rather than 8, and the same item padding at every size. All of that now follows Mantine's numbers and is measured by a browser test. The framework's colours are unchanged, and so is the switch track's audited border, which Mantine's switch does not have; it sits inside Mantine's outer size.

`toggles-settings-light-2026-10-26.png` and `toggles-settings-dark-2026-10-26.png` show the settings drawer's first section, Mantine on the left and the framework on the right. **The switch is the thing to look at.** "Apply gallery theme to editor" is on in both, and under Mantine it was close to invisible on both default themes: a near-white track with a dot on light, a hollow ring on dark. It is now a filled primary track with the thumb at the far end.

The described switch is about 5px taller than Mantine's, because its description keeps the type scale's 1.4 line height for `xs` text where Mantine used 1.2. I kept yours.

`segmented-access-mode-2026-10-26.png` is the gallery header's access-mode control, before above and after below. The track is rounder, and the checked segment shows the rule-13 indicator with its hairline on light. Its label is 600 where Mantine held every segment at 500. I kept the weight change because it is the framework's non-colour signal for the checked segment. Say if you would rather it held 500 throughout.

---

## 2. Yours: the slider's thumb

The slider has not moved. Mantine drew it at two sizes in the product:

| where | count | track | thumb |
|---|---|---|---|
| the layout builder's property panels, `xs` | 38 | 4px | 8px, all border: a solid primary dot |
| the settings panel's sections, default size | 18 | 8px | 16px, a 4px primary ring on white |

The framework draws one slider at every size: a 4px track and a 14px thumb with a 2px primary ring on `surface`, in a 20px row that is the drag target.

Matching Mantine would put an 8px dot in the builder, which is a small thing to grab with a pointer and a smaller one on a touch screen. Keeping the framework's one slider makes the builder's sliders larger and the settings panel's a little smaller and lighter.

**Which do you want?** I lean to the framework's one slider everywhere, for the target size. The other choices are Mantine's two sizes, or the framework's thumb on Mantine's track heights. Mantine also put a dot on the track at each mark, and the framework draws only the mark's label. Say whether the dots should come back; three sliders in the settings panel have marks.

---

## 3. Yours: four questions about the fields, before they move

Text fields, number fields and text areas are about 250 uses, and they are the next batch. The size corrections are mechanical and I will make them: padding per step, the large field's font size, and the password field's reveal button. These four are visible decisions, so they come to you first.

**Filled and unstyled fields.** Mantine has `filled` fields (a grey ground, no border) and `unstyled` ones (no ground, no border, no padding). The framework has one field look. `filled` is used on 29 fields in the layout builder's slot and mask property panels and on two selects in the campaign table. The builder's background, graphic and text panels use the ordinary field, so `filled` is not even consistent within the builder. `unstyled` is used on the builder's own title, which is edited in place, and on one unit picker inside a number field. **One look everywhere, or a filled variant for dense panels?** If filled, on which ground? The in-place title needs something either way, so say what an edit-in-place field should look like at rest.

**Number steppers.** No call site hides Mantine's steppers, so all 148 number fields show stacked up and down chevrons at the right edge today. You can see one on "Items Per Page" in the settings crops: 24px wide at the default size and 17px at `xs`. The framework draws a minus button before the value and a plus button after it, wider than Mantine's pair, and only when a call site asks for them. Moving as it stands would remove the steppers from every number field. **Steppers on by default, and in which form?** I lean to Mantine's stacked chevrons, on by default. They are narrow enough for the builder's panels, and keyboard arrows and the unit scrub still work beside them.

**Where the description goes.** Mantine places a field's description between its label and the input. The framework places it under the input, above any error. It is used on 31 text fields, 59 number fields and 2 text areas, mostly in the settings panel. **Above the input or below it?**

**Corner radius and the size of a small field's label.** Under this product's theme Mantine drew fields with an 8px radius, the same as its buttons. The framework draws them at 4px, which would make a field and the button beside it differ. Mantine also scaled a field's label with the field, so a label is 12px on an `xs` field. The framework keeps it at 14px at every size, and 69 fields are `xs`, mostly in the builder. **May fields take 8px corners and a 12px label at `xs`?** A description already floors at 12px by your rule, so only the label is in question.

One change I will make unless you object: Mantine's `suffix=" px"` was text typed after the number inside the field. The framework draws the unit in its own slot inside the field's border, at the right. Twenty fields use it, in the layout builder's panels and in the gradient editor the settings panel uses.
