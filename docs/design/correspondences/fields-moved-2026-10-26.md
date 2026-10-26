# The slider and the fields have moved; one thing about the off switch

**2026-10-26.** Follows `designer-answers-toggles-fields-2026-10-26.md`.

Everything in your letter is built and tested. It is in `COLOR-SPEC.md` as rule 18 (the primary-stroke outlines and the slider) and rule 19 (the fields).

## What was built

- **Switch.** A checked track's edge is `primaryStroke`, with the fill as its ground and a `primaryOnFill` thumb. The engine's 1.4.11 audit now names `primaryStroke` against `surface`, `surface2` and `surfaceRaised` on every theme. All 23 pass, since the stroke is selected against those grounds, but a theme that overrides it now fails by name.
- **Segmented control.** The checked segment keeps 600, and every segment reserves its 600 width. A test checks that choosing one moves nothing.
- **"Items Per Page".** Its label was muted because the old theme adapter painted every number field's and colour field's label `textMuted`. Both are `text` now, and the framework's labels already were.
- **Slider.** It is one slider, as in your table. The drag band reaches 2px above and below the 20px row, so the target is 24px and no panel moves. The test checks that both edges land on the control, and it fails without the band. There are no mark dots, and the mark labels sit on their values.
- **Fields.** Each field reads label, description, input, error. Corners are 8px. The label is 12px at `xs` and 14px at `sm`, at 500 in `text`. Stepper chevrons are stacked, 17px wide at `xs` and 24px at `sm`, out of the tab order, `textMuted` behind a `border` divider. The unit sits in its slot in `textMuted`. There is one field look: `filled` was dropped from 29 fields. The builder's title is `bare` and reserves its edge, so it does not move when clicked.
- **Disabled.** Fields and steppers follow rule 16. While building your crop I found that a disabled switch or checkbox still faded to 60%, so those follow rule 16 now too, with the label in `borderStrong`.

Two behaviours the tests caught on the way also matter to people using the product. An `aria-label` a call site gives a field names it again, over the visible label, as it did under Mantine. Number fields show plain digits again: the new component had started writing a pixel width as "1,200".

## The crop you asked for

`fields-crop-2026-10-26.png` shows default-light above default-dark. On the left is a switch off, on, disabled, and disabled while on, plus a disabled checked checkbox. Beside them are a number field with a description and its steppers, and a number field with a unit and steppers.

## Yours: the off switch has no visible thumb

The crop shows it on light. An unchecked switch's thumb is `surface` on a `surface2` track, and across the 23 themes that pair is 1.02 to 1.23:1 (ΔE00 0.75 on default-light). So an off switch reads as an empty outlined pill: you can see the control, but not where its thumb is. Mantine drew a white thumb on a grey track.

**My proposal is a `textMuted` thumb when off.** Measured against the track on all 23 themes, it is 5.10:1 at worst (5.27 on default-light, 6.88 on default-dark), and it stays distinct from the disabled thumb, which is `borderStrong` by rule 16. `borderStrong` would also clear 3:1, at 3.01 worst, but then an off switch and a disabled one would differ only by their edge and label. Say which you want, or something else.

## Left as they are, for the record

- An `xs` field sits about 3px tighter above its input than Mantine's did. Mantine's label row was 24.8px at every size because an inherited line box set it, not the label.
- The password field's reveal button is 22px where Mantine's was 26px, and it shows a glyph rather than an eye icon.
- The text area keeps the framework's padding.

None of these came up in your letters. They are recorded as follow-ons.

The access-request form on a locked campaign card is visitor-facing. Its email field dropped Mantine's overrides and takes the one field look. The unit picker inside the builder's scrub fields stays on Mantine until that component is rewritten onto the unit slot, as you described.
