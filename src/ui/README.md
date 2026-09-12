# `@/ui`: the component boundary

Application code imports UI primitives from `@/ui`. A direct `@mantine/*`
import anywhere under `src/` or `packages/*/src/` is a lint error outside this
directory.

## Why it exists

`@mantine/core` was imported directly in 142 non-test source files across 75
symbols, so there was no seam at which the component library could be
configured, wrapped or replaced. Phases 79 to 81 replace those components with
an in-house framework. Without a boundary that is a 142-file diff that cannot
be split; with one it is a series of small changes behind a stable import
path, and the intermediate state where both implementations coexist is safe by
construction.

## The rules

1. **New code imports from `@/ui`.** Never from `@mantine/core`,
   `@mantine/form`, `@mantine/hooks`, `@mantine/modals` or
   `@mantine/notifications`.
2. **`src/ui/index.ts` is the only file here that names a Mantine package.**
   When a framework component replaces a name, its export line moves from
   `@mantine/core` to a sibling module in this directory. The export list is
   the migration ledger.
3. **The barrel re-exports; the framework lives in sibling directories.**
   Phase 78 shipped the barrel as re-exports only. Phase 79 adds the first
   code of our own: `provider/` holds `MullionProvider`, the theme registry
   and the token sheet (P79-A); `styles/` holds the style registration list,
   its delivery and the framework's own sheets (P79-B, P79-C);
   `components/` holds the presentational set (P79-C). Interaction code
   arrives with the framework components in Phase 80, never in the barrel
   itself.
4. **A framework component joins the ledger when its consumers move.** The
   thirty components in `components/` are exported from `@/ui/components`
   and deliberately not from `@/ui`. Moving `Text` onto the framework in the
   list above would move all 92 files that import it in one commit, which is
   Phase 81's job and its pixel-refresh budget.

## The provider

`MullionProvider` owns everything that used to be spread across
`ThemeContext`'s variable injection, `OverlayRootSync`, `AdminChromeProvider`
and `adminChromeStyles()`: which tree the `--mullion-*` token sheet is written
into, the `color-scheme` on the scope, the container overlays portal into,
lock and follow for chrome, persistence and runtime themes. The rule it
enforces is that every element it paints, inline or portaled, sits under an
element carrying its tokens by stylesheet, so nothing is carried inline.

```tsx
<MullionProvider theme="tokyo-night" scope={shadowRoot} portal={overlayTarget}>
  ...
  <MullionProvider mode="lock">   {/* brand palette, identical tree in both modes */}
```

Hooks: `useMullionTheme()` (switching API, always the root's),
`useMullionScope()` (what the nearest provider paints), `useMullionPortal()`
(where overlays go). `defineTheme()` registers a theme at runtime and refuses
one that fails the contrast audits. A static test forbids any
`[data-*-color-scheme]` ancestor selector under `src/ui`.

## Style delivery

`styles/uiStyles.ts` is the one registration list. `registerUiStyles(id, css)`
appends a sheet in cascade order (or replaces one by id); the framework
registers `styles/base.css` at load and the app registers everything it still
needs in `src/appStyles.ts`. The provider calls `adoptUiStyles(root)` for every
root it paints, so the list reaches the gallery shadow root, the overlay root
and a light-mount document by the same mechanism: one `CSSStyleSheet` built
once per page and adopted everywhere, or a `<style data-mullion-ui-styles>`
element where the tree has no `adoptedStyleSheets`. Registering after adoption
rewrites every root at once.

A framework sheet is any `.css` or `.scss` under `src/ui/` outside tests. Three
static tests hold each one to no colour literal, no `!important` and no
ancestor scheme selector, reported by file and line. Component sheets write
into `@layer mullion.components`, declared in `base.css`, so consumer CSS wins
over them without specificity games.

## The presentational components

`components/` holds the thirty components the study lists as "ours,
presentational": no keyboard handling, no ARIA state machine, nothing to buy
from a headless primitive. Seven sheets, one per family, plus the focus rule,
registered into the style list when the module is imported.

Four rules govern every one of them:

1. **Colour is never a prop.** `tone="muted"` becomes `data-mullion-tone`,
   which the sheet resolves to a token. The seven tones are the theme's
   semantic roles, so a theme redirects all of them at once. `ColorSwatch` is
   the only exception, because the colour it shows is the user's data.

   A tone is four properties, not one, because the four answer different
   questions and different WCAG floors:

   | Property | What it is | Used by |
   |---|---|---|
   | `--mullion-tone` | the role's contrast-selected text rung, legible on every ground the theme puts text on | a label, a border, an icon |
   | `--mullion-tone-fill` | the role's fill rung | the ground of a `filled` control |
   | `--mullion-tone-on` | the ink that reads on that fill | the label of a `filled` control |
   | `--mullion-tone-wash`, `-wash-strong` | a tint of the role over the surface, at rest and on hover | the ground of a `light` control |

   And one rule governs their use: **tint the ground or colour the ink, never
   both.** A text rung is selected against the theme's plain surfaces, so a
   coloured label on a tint of its own role is a pair nothing has measured. An
   icon is the exception, because it answers to 1.4.11's 3:1 rather than
   1.4.3's 4.5:1. `e2e/ui-showcase.spec.ts` measures every tone against every
   variant on all 23 bundled themes, at rest and on hover, at both floors.
2. **Per-instance geometry is an inline custom property.** `gap="md"` becomes
   `--mullion-gap: var(--mullion-spacing-md)` on the element, so the value
   travels with it into any tree. A scale step resolves to a token, a number
   to pixels, any other string passes through, which is the reading Mantine
   gives the same props today.
3. **Variants and sizes are data attributes.** `[data-variant='light']` and
   `[data-size='xs']` rather than a class per combination.
4. **The focus ring is one rule.** Every focusable renders through
   `ControlBase`, which stamps `data-mullion-focus`; `styles/focus.css` is
   keyed on that attribute alone. `chrome-portable.scss` had to spell the
   ring as a list of Mantine class selectors and that list was twice found
   incomplete, which is the shape this replaces.

Polymorphism is a `render` prop, taking an element to clone or a function
handed the props: `<Text render={<label htmlFor="x" />} />`. Base UI, chosen
in P78-B, spells it the same way, so Phase 80 inherits one convention.

The layer scale is read through `uiLayer('modal')` rather than written as a
number. Only a token reference picks up `--mullion-layer-host-offset`, which
the WordPress embed raises when the admin bar is showing.

Storybook covers the set under `Framework/Presentational set`, with a theme
picker in the toolbar; those stories render under `MullionProvider` rather
than Mantine's, selected by `parameters: { mullion: true }`.
`src/ui/showcase/mount.tsx` is the e2e fixture that renders the same set in a
shadow mount, a light mount and the overlay root.

## The allow-list

`eslint-rules/mantine-boundary-allowlist.json` lists the files that already
reach Mantine directly, by import or by module mock. It is generated, not
hand-written:

```
npm run ui:allowlist          # regenerate after migrating a file
npm run ui:allowlist:check    # CI: fail if stale
```

The list only shrinks. Deleting an entry whose file still imports Mantine
fails lint; leaving an entry whose file no longer names Mantine fails the
boundary test. `maxFiles` is a ratchet the generator lowers but never raises,
so adding a direct import to a new file fails the test until someone edits
that number by hand.

Detection is a superset of what ESLint enforces, and deliberately so. A
`vi.mock('@mantine/notifications', ...)` names the package without importing
it, which no lint rule sees, but the mock still breaks once the package is
gone. Those files are on the list because they are work someone has to do.

## What is deliberately not here

Mantine's theme plumbing: `MantineProvider`, `useMantineTheme`,
`mergeThemeOverrides`, `DEFAULT_THEME`, `mergeMantineTheme`,
`defaultCssVariablesResolver`, `convertCssVariables`, `colorsTuple`,
`MantineThemeOverride`, `MantineColorShade` and `MantineTheme`. Those are
adapter concerns owned by `src/themes/` and `src/portalTarget.ts`, which Phase
81 deletes or rewrites. Routing them through the component surface would hand
the framework an API it has no use for.

`@mantine/dates` is a declared dependency with zero importers and is not
restricted; there is nothing to route.
