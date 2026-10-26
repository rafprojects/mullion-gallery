# UI scale mapping: Mantine props to the framework

**Track:** P81-A ([PHASE81_REPORT.md](PHASE81_REPORT.md))
**Created:** 2026-10-25
**Census:** `node scripts/ui-prop-census.mjs` (137 files import `@/ui` or `@mantine/core` outside `src/ui/`)

This is the one place the Mantine-to-framework prop mapping is written down. The codemods apply it; nothing here is decided per file.

## Two passes

Consumers keep rendering Mantine until their component's name flips in `src/ui/index.ts`, and Mantine ignores the framework's prop names. Renaming `c="dimmed"` to `tone="muted"` before the flip would silently un-style the site. The migration therefore runs in two passes (user decision, 2026-10-25).

| Pass | What moves | When | Pixel contract |
|------|-----------|------|----------------|
| 1 | Style props the framework drops entirely, into `style` | Now, all files at once | Zero pixels moved, proved by an exact before/after diff |
| 2 | Props the framework renames (`c`, `fw`, `ta`, `p`, `color`, the size and variant scales) | In the commit that flips each name in the barrel | Decision B: refresh, reviewed per surface |

## Pass 1: dropped props to inline style

`scripts/ui-codemod-pass1.mjs`. Mantine renders every non-responsive style prop as an inline style on the component's root, and its `Box` merges the caller's `style` after the style props. Moving a prop into `style` on the same element, ahead of any entry the caller already wrote, therefore renders the same declaration under either library.

Utility classes were the first choice and were rejected on measurement. Mantine's stylesheet sets `margin: 0` on `Text`, `Title` and about 75 other rules, and `main.tsx` loads that stylesheet unlayered into the document. Unlayered CSS beats `@layer mullion.components`, so a class would lose to it on light-mount galleries and in wp-admin, where today's inline style wins.

| Mantine prop | CSS property | Resolver |
|---|---|---|
| `m` `mt` `mb` `ml` `mr` `ms` `me` `mx` `my` | `margin`, `marginTop` and so on; `mx` is `marginInline`, `my` is `marginBlock` | spacing |
| `pt` `pb` `pl` `pr`, and `p` `px` `py` on components without padding props | `paddingTop` and so on; `px` is `paddingInline`, `py` is `paddingBlock` | spacing |
| `w` `h` `miw` `maw` `mih` `mah` | `width`, `height`, `minWidth` and so on | spacing |
| `top` `left` `right` `bottom` `inset` `lts` | the property of the same name; `lts` is `letterSpacing` | size |
| `pos` `display` `flex` `opacity` `ta` `fw` `fs` `tt` `td` | `position`, `display` and so on | identity |
| `fz` | `fontSize` | font size |
| `lh` | `lineHeight` | numbers only |

The resolvers reproduce Mantine's (`node_modules/@mantine/core/esm/core/Box/style-props/resolvers/`) with `--mantine-scale` at its default of 1:

| Value | Becomes | Why |
|---|---|---|
| A scale step, `"sm"` | `var(--mullion-spacing-sm, var(--mantine-spacing-sm))` | Both sets are generated from the same theme definition. The fallback serves the wp-admin apps, which run under a bare `MantineProvider` with no `--mullion-*` tokens until P81-B gives them a provider. P81-D strips the fallbacks. |
| A negative step, `"-sm"` | `calc(<the token above> * -1)` | Mantine's reading. |
| A number, `4` | `uiRem(0.25)` | Mantine's `rem()` divides by 16 and multiplies by its scale. Pass 1 first wrote `'0.25rem'`; P81-F converted every such literal to `uiRem`, which multiplies by the same page scale. |
| `0` | `'0'` | |
| A pixel string, `"10px"` | `'0.625rem'` | Mantine converts these too. |
| Any other string, `"100%"`, `"auto"`, `"80dvh"` | unchanged | |
| An expression, identity resolvers | passed through | Mantine applies nothing to it. |
| An expression, any other resolver | left for a person | A runtime value might be a scale step or a number, and the two read differently. |

Never moved by pass 1:

- **Colour props** (`c`, `bg`, `ff`): choosing a token for `c="red"` is a judgement. 265 sites, all in pass 2.
- **Props the framework component renames.** `Text`: `fw` `ta` `tt` `fs` `fz`. `Title`: `ta`. `Image`: `w` `h`. The padded components (`Box`, `Stack`, `Group`, `Center`, `Container`, `Grid`, `SimpleGrid`, `Paper`, `Card`, `Card.Section`, `Alert`): `p` `px` `py`.
- **Responsive objects** (`p={{ base: 'sm', md: 'md' }}`): the framework has no responsive prop form; these become classes by hand.
- **Elements with a spread attribute**, or a `style` that is not an object literal: the merge order cannot be proved from the source, so a person does each one.

## Pass 2: renames

Pass 2 runs per component name. The rows below were settled by the designer on 2026-10-25 (`docs/design/correspondences/designer-answers-ui-scale-mapping-2026-10-25.md`); the two left open went back with data the same day (`ui-scale-mapping-data-2026-10-25.md`) and were settled in `designer-answers-scale-data-2026-10-25.md`.

### Props

| Mantine | Framework | Notes |
|---|---|---|
| `p` `px` `py` on the padded components | `padding` `paddingInline` `paddingBlock` | Same tokens and semantics. |
| `Text fw={500}` | `weight={500}` | |
| `Text ta` / `Title ta` | `align` | |
| `Text tt="uppercase"` | `transform="uppercase"` | |
| `Text fs="italic"` | `italic` | |
| `Text ff="monospace"` | `font="mono"` | |
| `Text fz` / `Text size` | `size` | Any size below the smallest text token (`xs`, 0.75rem) floors to `xs` and is listed for review, because a size below the scale is a flag for an unaudited ground. The three 10px field affixes (`W`, `H`, `°`) take `xs` and `tone="muted"`. The 10px asset name takes `xs`. The 9px white caption over a media thumbnail takes `xs` on a bottom scrim reaching `rgba(0,0,0,0.60)` at the caption line (white on `#666666`, 5.74:1 over the worst case, a white image); if one line loses too much, the tile grows. |
| `Title size="h3"` | `size={3}` | |
| `Image w` `h` | `width` `height` | |
| `Button size="compact-xs"` | `size="xs" compact` | 8 sites. |
| `ActionIcon size={14}` and other numbers | unchanged | The framework takes a number. |
| `Badge variant="dot"` | `variant="outline"` with the tone | The toned badge's role glyph replaces the dot, which removes four colour-only signals. 4 sites. |
| Field `variant="filled"` | dropped | The framework field already sits on `surface2`, which is the filled input. If dropping it changes the reading, the default field is wrong. 31 sites, 29 of them in the Layout Builder's property panels. |
| Field `variant="unstyled"` | `bare`, or the unit slot | 2 sites. `UnitScrubField`'s unit picker moves onto the framework number field's unit slot. The builder's title-bar rename takes a new `bare` prop on the framework field: at rest it reads as the text it is, with no box; on hover the ground washes to `surface2` with the field's radius and a `text` cursor, ink unchanged; on focus the inset ring, ground staying on the wash. An `EditableText` component waits for a second inline-edit site. |
| `Container size="sm"` | `size="sm"` | Takes the framework's 48rem (768px), 48px wider than Mantine's 720px, and is reviewed on its surface. `size={720}` only if the layout was tuned to that width. One site. |

### Colour

The rule for every colour prop, `c`, `bg` or `color`: **a Mantine palette name or shade maps to a role, never to a hex or a shade.** Where no role fits, the site goes on a list of gaps in the role set for the designer, not into a literal.

| Mantine | Framework |
|---|---|
| `c="dimmed"`, `c="gray"` on text | `tone="muted"`. 236 `dimmed` sites. An un-toned `Text` inherits, as Mantine's does (P79-0). |
| `c="dark"` on text | no tone; it inherits `text` |
| `red` | `tone="danger"` |
| `green` | `tone="success"` |
| `teal` | `tone="primary"`, or `tone="success"` only where the element reports that something succeeded. 5 sites, each read. |
| `orange`, `yellow` | `tone="warning"` |
| `blue` on a control (`Button`, `ActionIcon`, `Anchor`, `Tabs`, anything operated) | `tone="primary"` |
| `blue` on a status component (`Alert`, `Badge`, a toast, anything reporting a state) | `tone="info"`. Identical on the default themes; divergent on homage themes such as Nord. |
| `gray`, `dark` on a control | no tone. The un-toned control is the quiet neutral one; if it does not read that way, that is one component defect, not fourteen props. |
| A shade (`orange.4`, `red.9`, `gray.0`) | the role it stands for: `bg="red.9"` is a danger fill, `c="orange.4"` is warning text |
| `c="white"` on a fill | the fill's on-colour, which a toned component already supplies |

### Numbers and the size basis

**Settled and built: numbers share the tokens' basis.** A number in a spacing or size prop is read as rem times the framework's scale, as Mantine reads it, so a number and a token always shrink or grow together. P81-F corrected `src/ui/components/scale.ts`, which had read numbers as pixels.

**The basis itself was unprotected, and P81-F fixed it.** Measured 2026-10-25 with `html { font-size: 62.5% }` on the dev page: `lg` 20px became 12.5, `md` 16 became 10, `xs` 10 became 6.25. The designer's invariant, now held by `e2e/size-basis.spec.ts`: one token step is the same physical size on every host. How it is built is in `src/ui/README.md`, under The size basis.

**Off-scale numbers fold onto tokens.** Of 409 `gap` values, 136 are numbers:

| Value | 0 | 2 | 3 | 4 | 6 | 8 |
|---|---|---|---|---|---|---|
| Sites | 9 | 16 | 2 | 69 | 36 | 4 |

Three rungs join the spacing scale below `xs`: `4xs` 2px, `3xs` 4px, `2xs` 6px. The scale's bottom becomes 2, 4, 6, 10, 12, 16, 20, 32.

| Number | Sites | Becomes | Review |
|---|---|---|---|
| 0 | 9 | `0` | no |
| 2 | 16 | `4xs` | no |
| 3 | 2 | `3xs` | yes: one control (the gradient-direction buttons), two files |
| 4 | 69 | `3xs` | no |
| 6 | 36 | `2xs` | no |
| 8 | 4 | `xs` | yes: 2px looser |

130 of 136 move mechanically. A literal survives pass 2 only where the value is deliberately off-scale, and it is emitted in the tokens' basis.

## Pass 2 progress

`scripts/ui-codemod-pass2.mjs <Name,...>` applies the rows above for the names it has rules for, moves a direct `@mantine/core` import of those names to `@/ui`, and lists what it will not guess. The barrel line moves in the same commit.

| Name | Flipped | Sites | Notes |
|---|---|---|---|
| `Stack`, `Group` | 2026-10-25 | 303 edits in 105 files | Every numeric gap but the nine zeros folded onto a rung; 6 listed for review (3px to `3xs` twice, 8px to `xs` four times). `packages/shared-ui`'s five files stay on Mantine until batch zero, with the last two numeric gaps (`AuthBarMinimal.tsx:74` and `:84`). |

**Checks every flip carries**, both found on the first one:

- **Per-instance custom properties inherit.** A component that reads `var(--mullion-x, default)` and was given no `x` reads its nearest ancestor's instead. The layout family now resets what it reads (`layout.css`); before a family flips, its sheet is checked for the same leak, keeping deliberate inheritance such as `Card.Section` reading its card's padding. `e2e/layout-nesting.spec.ts` is the pattern for the test.
- **Behaviour the defaults do not show.** `Group grow` gives each child `flex: 1 1 0`, equal shares from zero; Mantine gave each its content width plus an equal share of the rest, capped at an equal share. They agree unless a child's content is wider than its share. 37 sites in 10 files; none is on a `theme-qa` surface, so they are listed for the designer rather than proved.

