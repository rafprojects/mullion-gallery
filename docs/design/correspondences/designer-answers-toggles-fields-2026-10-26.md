# Toggles approved, with one edge on the switch. One slider. One field, steppers on, description above.

**2026-10-26.** Reply to `toggles-moved-fields-next-2026-10-26.md`.

Thanks for the two chip changes and for rule 17 matching them. And the geometry drift you found in
the toggles is the same drift the buttons had: a size step that changes nothing is not a size step.
Good that it was measured back first.

---

## 1. Toggles: approved, with one change to the checked switch

**The switch is the improvement you said it was.** Under Mantine it barely showed whether it was
on: a white track with a dot on light, a hollow ring on dark. Now it reads as on from across the
room on both themes. The description sitting under the label's text and not under the control is
right. So is the 1.4 line height, and so are the extra 5px it costs.

**The checked track's edge takes `primaryStroke`.** I measured the right-hand crops:

| default theme | checked track | against `surface` | thumb on track |
|---|---|---|---|
| dark | `#007870` (`primaryFill`) | **2.95:1** | 5.36 |
| light | `#006e66` | 5.85 | 6.14 |

A switch has no label inside it to say what it is. The track is the control's outline, and 1.4.11
asks 3:1 of it. On default-dark the fill misses by a hair. That gap is what `primaryStroke` exists
to close: `#008e85` is 3.92 against `surface`. So the checked track keeps `primaryFill` as its
ground, the thumb still sits on the audited 5.36 pair, and the track's border, which you already
carry inside the outer size, takes `primaryStroke` when the switch is checked. On the 10 themes where
the two tokens are equal, nothing changes. On the other 13 the fill fails 3:1 against at least one
of the three grounds, and the switch was failing with it. Test it the way the halo is tested:
checked edge against `surface`, `surface2` and `surfaceRaised`, every theme, by name.

**The thumb on a checked switch is `primaryOnFill`, not a fixed white.** It is white on both defaults,
so the crops cannot tell me which it is. On a theme with a light accent the fill takes black ink,
and a white thumb on it would vanish.

**Segmented control: keep the 600.** The checked segment now has three signals: the raised
indicator with its hairline, `text` ink against the unchecked segments' muted ink, and the weight.
The weight is the one that holds without colour and without the hairline, so it stays. One
condition, the same one the chip had: **each segment reserves its 600 width**, so choosing Hide does
not shift Lock. Test it the way the chip's width test does.

**One thing in the crops that is not a toggle.** The "Items Per Page" label is in `textMuted`, both
before and after (`#9db4bf` on dark, `#5f6c71` on light, measured), while "Theme" and "Default Layout"
above it are in `text`. It passes contrast, but it is the same ink as its own description, so the
label no longer reads above the description. A field's label is `text`, always. If this is a
call-site `dimmed`, drop it when the fields move. If something in the number input's label path
paints it, that is a framework fix.

---

## 2. The slider: the framework's one slider, everywhere

Your lean is right. An 8px dot is too small a thing to drag, and having two sliders whose only
difference is which panel they sit in is the problem this migration keeps removing. The builder's
sliders get easier to use, and the settings panel's get lighter. Neither is a loss.

Specified, so it is one thing:

| part | paint |
|---|---|
| thumb | 14px, `surface` ground, 2px **`primaryStroke`** ring. Stroke, not primary: the ring is the control. |
| track, filled | 4px, `primaryStroke` |
| track, unfilled | 4px, `border`. Rule 14 keeps it visible. The thumb carries the value. |
| keyboard focus | the standard ring, drawn around the thumb, not the row |
| disabled | rule 16: thumb ring and filled track in `borderStrong`, unfilled in `border`, no focus |

**Make the drag target 24px tall without making the row taller.** Use a pseudo-element or a
negative margin around the 20px row, so no panel's layout moves. 24px is WCAG 2.2's minimum target.
At 20px the slider only passes through the spacing exception, which depends on whatever sits next
to it.

**No mark dots.** On a 4px track a dot is either wider than the track, which puts a second round
shape beside the thumb, or too small to see. Each mark's label already sits under its position.
That leaves three sliders, and a new shape with its own colour pairs is not worth it for them. Do
centre each label exactly on its value.

---

## 3. The fields

**One look everywhere. No `filled` variant.** A filled field is a grey ground with no border, which
leaves the field's boundary to a single rung step. That is ΔE00 2.80 on default-light, which makes
it the quietest edge in the product, and it is the edge that tells a user where to type. A dense
panel gets its density from the `xs` size, not from a different field. The builder already uses
both looks, panel by panel, so making it one look fixes an inconsistency without adding anything.
The two selects in the campaign table take the ordinary field too.

**The in-place title is a `bare` field, and at rest it looks like the title it is:**

| state | ground | edge | ink |
|---|---|---|---|
| rest | none | none, with the field's padding and radius reserved so nothing moves | `text`, in the title's type style |
| hover | none | `border` | `text` |
| focus | the ordinary field's ground | the ordinary field's focus state | `text` |
| empty | as above | as above | placeholder in `textMuted` |

The reserved padding is the important line. A title that jumps 10px sideways when it is clicked
looks broken. **The unit picker inside the number field** does not need the bare look. It goes in the
same right-hand slot as the unit (see the end of this section): `text` ink, its chevron, no ground of
its own, and the inset ring when it takes focus, because it sits inside the field's border.

**Steppers: on by default, Mantine's stacked chevrons.** Taking them off 148 fields would be a
regression nobody asked for. The plus-and-minus form costs width the builder panels do not have.
Three conditions:

- **They are out of the tab order.** Arrow keys are the keyboard path, as they are now. Two extra
  tab stops on every number field would make the settings panel a long walk.
- Chevrons in `textMuted`, a `border` divider between them and the value, and the same hover as a
  subtle icon button. A disabled field follows rule 16 and its steppers do too.
- The flanking minus and plus stay available for a call site that asks for them, which should be
  rare.

At `xs` each chevron is a small target. That is acceptable here because typing, arrow keys and the
scrub all do the same job, and 2.5.8 makes an exception for a target with an equivalent.

**The description goes above the input.** The order is label, then description, then input, then
error. A description is usually what you need before you type ("1–100", "saved when you click Save").
Below the input, it gets confused with the error that appears in the same place and gets covered by
autocomplete lists. Your Selects already put it above, as the crops show, so this also keeps
fields and selects alike.

**8px corners: yes.** A field beside a button should not have different corners from it.

**A 12px label at `xs`: yes, and no smaller at any size.** At 12px a label and its description are
the same size, so they are told apart by weight and ink: the label is `text` at 500, the description
`textMuted` at 400. That is why the muted "Items Per Page" label above matters. At `xs` it would be
indistinguishable from its own description.

**The unit in its own slot: yes.** The unit is not part of the value. The caret should not land in
it, and a copy should give you a number. Unit ink is `textMuted`.

---

## 4. Where it stands

| | |
|---|---|
| Switch | Approved. Checked track edge is `primaryStroke`, tested per theme against the three grounds. Thumb is `primaryOnFill`. |
| Segmented | Approved. Checked at 600, with every segment reserving its 600 width. |
| "Items Per Page" label | `textMuted` today. Labels are `text`. Find which layer paints it. |
| Slider | The framework's one slider everywhere, as in the table above. Drag target 24px. No dots. |
| Filled / unstyled | One look. The in-place title is `bare`, as in the table above. The unit picker goes in the unit slot. |
| Steppers | On by default, stacked chevrons, out of the tab order. |
| Description | Above the input. |
| Radius, `xs` label | 8px corners. 12px label at `xs`, 500 `text`. |
| Unit slot | Yes. |

When the fields move, send one crop with a switch off, on and disabled on both defaults, beside a
number field with its steppers. That covers everything in this letter that a screenshot can check.
Nothing else is open on my side.
