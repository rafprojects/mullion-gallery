# Pass 2 has started: Stack and Group are on the framework

**2026-10-25.** Follows `designer-answers-scale-data-2026-10-25.md`.

Your table in section 2 is built, and the first two names have moved onto it. Below: what moved, the six sites you asked to see, one behaviour difference I cannot prove from screenshots, and one defect the first flip exposed.

---

## 1. What moved

The three rungs are in the theme: `4xs` 2px, `3xs` 4px, `2xs` 6px, with the base values filled in for any theme written before them. `Stack` and `Group` now render the framework's components across 105 files, and every numeric gap on them sits on a rung except the nine zeros. The exception is the auth bars and login form in the old shared package, which stay on Mantine until that package is dissolved.

On every surface the `theme-qa` suite photographs (the gallery shell, the Settings drawer, the open theme selector, on six themes), the flip moved **zero pixels** against the captures taken before it, compared without tolerance.

The wp-admin pages (Gallery Spaces, Asset Library) now have a framework provider too, because the new layout components need its tokens and sheets. They paint the light default theme, which is what their Mantine default always looked like. I am checking them in a browser on the dev site next.

## 2. The six sites you asked to review

| Site | Was | Now | What it is |
|---|---|---|---|
| `GradientEditor.tsx:96` | 3px | `3xs` (4px) | the row of gradient-direction icon buttons in the gradient editor |
| `BackgroundPropertiesPanel.tsx:216` | 3px | `3xs` (4px) | the same row, in the Layout Builder's background panel |
| `MaskPropertiesPanel.tsx:96` | 8px | `xs` (10px) | the "no mask layer" empty state; it has one child, so the gap renders nothing |
| `SlotPropertiesPanel.tsx:404` | 8px | `xs` (10px) | the focal-point preview row: a 64 by 40 thumbnail beside its controls |
| `CampaignViewer.tsx:116` | 8px | `xs` (10px) | the company badge on a campaign's cover: logo then name, inside a large badge |
| `AdapterHeading.tsx:36` | 8px | `xs` (10px) | a gallery section heading: its icon then its label |

None is on a photographed surface. If any of the 8-to-10 changes reads as too loose, say which, and it goes back to a literal as a deliberate off-scale value.

## 3. One behaviour difference: `grow`

`<Group grow>` gives its children equal shares of the row. Mantine and the framework get there differently:

| | Mantine | Framework |
|---|---|---|
| A child's starting width | its content's width | zero |
| How it grows | an equal share of what is left | an equal share of the whole row |
| Its ceiling | one equal share; content wider than that is squeezed | the whole row; content wider than its share pushes the others narrower |

They render the same unless a child's content is wider than its share. In a narrow panel that can happen: a number field with a long label beside a short one. Mantine holds the two columns equal and squeezes the long one; the framework lets the long one take more.

There are 37 `grow` rows in 10 files, nearly all pairs of fields (X and Y, width and height, line height and letter spacing) in the Layout Builder's property panels, the Typography editor and the media display settings. **Which do you want: columns that stay equal whatever their content, or columns that make room for it?** Equal is Mantine's, and one line in the framework's sheet; I have left the framework's behaviour in place until you say.

## 4. The defect the first flip exposed, now fixed

The first capture after the flip was not zero: the gallery's filter chips had spread across the whole row, "All" at the left and "My Access" at the far right. The cause was in the framework, not the call site. Every per-instance value (a gap, an alignment, a padding) travels as a custom property on the element, and custom properties inherit, so a `Group` that set no `justify` read its parent's `space-between`. The same leak would have given a bare `Stack` inside a padded card the card's padding.

Each layout component now resets the values it reads, and a browser test nests a bare row and column inside ones that set everything. It is the same class of defect as the tone inheritance in P79-0, in geometry this time. Every family will get the same check before it flips: the remaining components read radius, padding and size the same way, and a button inside a `Paper` with a radius would have taken the paper's radius.
