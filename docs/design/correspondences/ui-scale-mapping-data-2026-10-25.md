# UI scale mapping: the data you asked for, and the size basis measured

**2026-10-25.** Reply to `designer-answers-ui-scale-mapping-2026-10-25.md`.

Every row you answered is now in `docs/UI_SCALE_MAPPING.md` as settled. Below are the measurement, the three data sets you asked for, and two questions they raised.

---

## 1. The size basis is unprotected today, measured

I mounted the gallery twice, once at the default root and once with `html { font-size: 62.5% }`, and measured the physical gap between the first two children of the first three flex rows in the gallery's shadow root (bounding rectangles, not computed styles):

| Element | Token | Default root (16px) | 62.5% root (10px) |
|---|---|---|---|
| `Stack` | `lg` | 20px | 12.5px |
| `Group` | `md` | 16px | 10px |
| `Group` | `xs` | 10px | 6.25px |

Every token shrinks with the host's root, exactly as you predicted. Nothing sets `--mantine-scale`, and the framework's tokens have no scale of their own. The product therefore ships 37.5% smaller on any theme that sets the root that way, and that is true now, before any migration.

I am filing your invariant as its own Phase 81 track, ahead of pass 2's number mapping: one step is the same physical size on every host, and numbers share the tokens' basis.

## 2. The 136 numeric gaps

| Value | Sites | `Stack` | `Group` |
|---|---|---|---|
| 0 | 9 | 9 | 0 |
| 2 | 16 | 10 | 6 |
| 3 | 2 | 0 | 2 |
| 4 | 69 | 31 | 38 |
| 6 | 36 | 9 | 27 |
| 8 | 4 | 1 | 3 |

(`SimpleGrid` and `Grid` have no numeric gaps.) Your expectation holds for 2 and 4: `3xs` (2px) and `2xs` (4px) would take 85 sites, and 0 needs no step. **The surprise is 6px: 36 sites, a quarter of the total, with no step under your proposal.** It sits exactly between `2xs` (4) and `xs` (10).

**Question A.** Does 6 get a step of its own, or do those 36 sites go to 4 or to 8 in review? If it gets one, the four rungs below `xs` would be 2, 4, 6, 8, and 8 (4 sites) might fold into it or stay a literal. The two 3s are the same control in two files: the row of gradient-direction icon buttons in `GradientEditor.tsx:94` and its copy in `BackgroundPropertiesPanel.tsx:217`. They should take whatever the 2 and 4 sites take, as one decision.

## 3. The field variants: 33 sites, not 28

My count in the mapping document was wrong. It counted three components and missed `ColorInput`.

| Variant | Component | Sites | Where |
|---|---|---|---|
| `filled` | `NumberInput` | 18 | `SlotPropertiesPanel` 14, `MaskPropertiesPanel` 4 |
| `filled` | `Select` | 7 | `SlotPropertiesPanel` 5, `useCampaignsRows` 2 |
| `filled` | `TextInput` | 3 | `SlotPropertiesPanel` |
| `filled` | `ColorInput` | 3 | `SlotPropertiesPanel` |
| `unstyled` | `TextInput` | 1 | `LayoutBuilderModal.tsx:556` |
| `unstyled` | `Select` | 1 | `UnitScrubField.tsx:130` |

The 31 `filled` sites drop the prop as you said. Twenty-nine of them are in the Layout Builder's property panels, so that batch's review is where any difference from the default field will show.

The two `unstyled` sites, one word each:

- **`LayoutBuilderModal.tsx:556`: rename.** The template's name in the builder's title bar, bold at `lg`, click to edit. That is your case (a), and the only one.
- **`UnitScrubField.tsx:130`: unit.** The `px`/`%`/`rem` picker sitting in a number field's right-hand slot, with its own left border. That is neither (a) nor (b). Phase 80 shipped a number field with a unit slot for exactly this, so it migrates onto that slot and stops being a `Select` at all.

**Question B.** One inline-edit site: is that enough for a `bare` prop on the framework field, or should the title-bar rename be its own small component? Either is one addition. I would lean to the prop, because the Settings panel's Typography redesign (also P81-B) may want the same thing.

## 4. The sub-token text

The smallest text token is `xs`, 0.75rem (12px). Five sites sit below it:

| Site | Size | What it is |
|---|---|---|
| `SlotPropertiesPanel.tsx:544` | 10px | `W` affix inside a width field |
| `SlotPropertiesPanel.tsx:570` | 10px | `H` affix inside a height field |
| `SlotPropertiesPanel.tsx:611` | 10px | `°` affix inside a rotation field |
| `SpaceAssetLibrary.tsx:180` | 10px | an asset's file name under its thumbnail, truncated, full name in `title` |
| `MediaPickerSidebar.tsx:412` | 9px | a media item's title overlaid on its thumbnail in white, truncated to one line |

Per your rule, all five floor to `xs` in pass 2. Two notes for your review. The three affixes sit in an `xs` field whose own text is 12px, so at 12px they would match the value beside them, which may be the right reading. The 9px thumbnail caption carries real content (the title) inside a fixed-size tile, so flooring it to 12 will truncate more of it; whether the tile grows or the caption goes is a layout call for you.
