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
| A number, `4` | `'0.25rem'` | Mantine's `rem()` divides by 16. Pixels would match only where the host's root font size is 16px. |
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

## Pass 2: renames (draft, needs the designer)

Pass 2 runs per component name. The rows marked **open** need the designer's call before the codemod is written. The rest follow the framework's own props.

| Mantine | Framework | Notes |
|---|---|---|
| `p` `px` `py` on the padded components | `padding` `paddingInline` `paddingBlock` | Same tokens and semantics. |
| `Text fw={500}` | `weight={500}` | |
| `Text ta` / `Title ta` | `align` | |
| `Text tt="uppercase"` | `transform="uppercase"` | |
| `Text fs="italic"` | `italic` | |
| `Text ff="monospace"` | `font="mono"` | |
| `Text fz` / `Text size` | `size` | `size="10px"` and `"9px"` pass through as lengths. |
| `Title size="h3"` | `size={3}` | |
| `Image w` `h` | `width` `height` | |
| `c="dimmed"` | `tone="muted"` | 236 sites. P79-0 confirmed `Text` inherits when un-toned, as Mantine's does. |
| `color` / `c`: `red` | `tone="danger"` | |
| `green` | `tone="success"` | **open:** `teal` (5 sites) also success? |
| `orange`, `yellow` | `tone="warning"` | |
| `blue` | `tone="primary"`, or `tone="info"` on `Alert` | **open:** which, per component. |
| `gray`, `dark` | no tone, or `tone="muted"` | **open:** 14 `ActionIcon color="gray"` sites read as the neutral control. |
| `c="white"`, `"orange.4"`, `"inherit"`, `bg="gray.0"`, `bg="red.9"` | by hand | No tone carries a literal shade. |
| `Button size="compact-xs"` | `size="xs" compact` | 8 sites. |
| `ActionIcon size={14}` and other numbers | unchanged | The framework takes a number. |
| `Badge variant="dot"` | **open** | The framework badge has `filled`, `light` and `outline`. 4 sites. |
| `TextInput`/`NumberInput`/`Select variant="filled"` or `"unstyled"` | **open** | The framework fields have no variant prop. 28 sites. |
| `Container size="sm"` | `size="sm"` | The step names do not map one to one: Mantine's `sm` is 720px, the framework's is 48rem (768px). The single call site moves 48px wider unless it is given `size={720}`. |

**Numbers in pass 2: an open discrepancy.** `src/ui/components/scale.ts` reads a number as pixels and says that is "the same reading Mantine gives". Mantine reads it as rem (`rem(4)` is `0.25rem`). The two agree only where the host's root font size is 16px. On a WordPress theme that sets `html { font-size: 62.5% }`, a migrated `gap={4}` grows from 2.5px to 4px while every token-based gap shrinks with the root. Pass 1 emits rem so it stays neutral. Whether the framework should follow Mantine here is for the designer and the user, before pass 2 reaches `Stack` and `Group` (409 `gap` sites, 136 of them numbers).
