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
   its delivery and the framework's own sheets (P79-B). Interaction code
   arrives with the framework components in Phase 80, never in the barrel
   itself.

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
