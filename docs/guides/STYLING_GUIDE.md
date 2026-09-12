# Styling Guide

How CSS reaches a rendered element in this app, which channel to write a given
style through, and the tests that hold that choice in place. The first half is
the style-delivery contract from Phase 77 track A; the second half keeps the
older embedding guidance that still applies.

Every claim of reach below was measured in a browser on 2026-09-09, in both
mount modes and both `applyThemeEverywhere` states, with the Settings drawer
and the Admin panel open. The probe compared each stylesheet's selectors
against `document.styleSheets` and the shadow root's sheets. Do not update the
reach columns from reading source; re-measure.

## 1. The two trees

The app mounts in one of two ways, and the shipped default is the first:

| Mount | When | Where the app renders |
|-------|------|-----------------------|
| Shadow | default; every WordPress shortcode | a shadow root on the host element (`#mullion-default`, `#root` in dev) |
| Light | `?shadow=0` or `window.__USE_SHADOW_DOM__ = false`; the wp-admin Spaces and Asset pages | directly under the host element |

Mantine's `Portal` appends to `document.body`. Under a shadow mount, every
Drawer, Modal, Menu, Popover, Tooltip and Select dropdown that uses the portal
therefore renders in the **document**, outside the shadow root that holds the
gallery. A stylesheet lives in exactly one tree, and a rule in the wrong tree
does nothing, without any error. That single fact is behind five of the six
visual defects fixed in Phase 76, and it is the reason this contract exists.

Two surfaces are worth naming because they sit on opposite sides of the line:

- The **Settings drawer** (`SettingsPanel`) and the **Layout Builder**
  (`LayoutBuilderModal`) are portaled. They are in the document.
- The **Admin panel** (`AdminPanel`, including the Campaigns and Media tabs)
  renders inline in `App.tsx`. It is in the gallery tree, inside the shadow
  root under the shipped mount.

**Portal modes (P77-B, default flipped in P77-I).** Where portaled chrome
renders is a mount option, `src/portalTarget.ts`. **`overlay-root` is the
shipped default:** a second shadow root of ours on a body-level host. The
chrome is therefore in a tree we own, so M2 reaches it and host-page CSS does
not. `adminChromeStyles()` still carries the locked brand palette's
`--mantine-*` variables, because the nested chrome provider renders its
variable sheet in the gallery tree; that is Phase 81's removal.

The other two are explicit overrides: `document` (the pre-P77-I placement,
kept for support cases) and `shadow` (into the gallery root; rejected, it
breaks inside any transformed ancestor). A light mount ignores the mode
entirely and keeps overlays in the document.

**Reading the reach tables below.** They are written for the two *trees*, and
under the shipped default portaled chrome is in the overlay root rather than
the document. Where a row says "portaled chrome", read it as "the overlay
root" unless the mode is overridden to `document`. The decision and its
measurements are in the Phase 77 report.

## 2. Delivery mechanisms

There are four ways CSS physically arrives at an element. Everything a
developer writes is one of these, and reach is a property of the mechanism.

| # | Mechanism | Shadow mount reaches | Light mount reaches |
|---|-----------|----------------------|---------------------|
| M1 | **Document stylesheet.** Any `import './x.css'` or CSS module in the bundle. Vite injects a `<style>` per file in dev; in production the plugin enqueues the built CSS from the Vite manifest (`class-mullion-embed.php`) and lazy chunks inject their own `<link>`. | document only: portaled chrome, never the gallery | everything |
| M2 | **The framework's shared sheet (P79-B).** One registration list, `src/ui/styles/uiStyles.ts` plus the app's entries in `src/appStyles.ts`, built once per page into a `CSSStyleSheet` that `MullionProvider` adopts into every root it paints, with a `<style data-mullion-ui-styles>` fallback where `adoptedStyleSheets` is missing. Vendor sheets, `global.scss`, `chrome-portable.scss`, Dockview, `builder.css` and every CSS module are on it. | gallery tree and the overlay root, one parsed sheet shared by both | the document, adopted once |
| M3 | **The token sheet (P79-A).** `MullionProvider` writes the `--mullion-*` tokens and the `color-scheme` declaration per scope: keyed on `:host` in a shadow root, `:root` in a document, or `[data-mullion-scope]` on an element or the portal container, always into the tree that element is in. Mantine still writes its own `--mantine-*` sheet at `cssVariablesSelector` and a `.mullion-admin-chrome` sheet for the nested chrome provider, both rendered where the React root lives, and React 19 hoists Mantine's responsive style-prop sheets (`__mdi__-*`) to the front of the root. | gallery tree and the overlay root, each under its own scope; `--mantine-*` reaches the overlay root only through `OverlayRootSync` and `adminChromeStyles()` | document, scoped to the host element; the portal container carries its own copy |
| M4 | **Inline `style` on the element.** Mantine's `styles` prop, its `vars` prop (custom properties), `adminChromeStyles()` and the `--mullion-builder-*` block. Travels with the element wherever it is portaled. | the element | the element |

Mantine's own `styles.css` is imported unconditionally in `main.tsx` (M1,
for the wp-admin apps that have no provider until P81-B) and registered in
`src/appStyles.ts` (M2) inside the `mullion.vendor` cascade layer. Since
P79-B a sheet of ours cannot reach one tree and miss another, because there
is one list and the provider writes it everywhere it paints. The layer is
what makes a vendor sheet adoptable: an adopted sheet cascades after every
`<style>` in its tree, and Mantine's `styles.css` declares default variables
that its runtime variables sheet overrides at the same selector by coming
later. Layered declarations lose to unlayered ones whatever the order, so the
runtime sheet, React's hoisted responsive style-prop rules and our own
overrides all win over Mantine's core rules by construction rather than by
position. Framework sheets under `src/ui/` are never layered under
`mullion.vendor`; components write into `mullion.components`.

## 3. Authoring surfaces

| Surface | Mechanism | Reach under the shipped mount | Status |
|---------|-----------|-------------------------------|--------|
| `src/styles/chrome-portable.scss` | M2, and M1 for the wp-admin apps | every tree; also leaks into the host page | **canonical** for Mantine class overrides, until Phase 81 deletes it with them |
| `src/styles/global.scss` | M2 | every tree the provider paints, scoped by its own `.mullion-gallery` ancestor | **canonical** for structural rules under `.mullion-gallery`; every selector must carry that ancestor (tested) |
| CSS module registered in `src/appStyles.ts` (every module: `CampaignCard`, `CardGallery`, `CampaignViewer`, `MediaCard`, `MediaTab`, `TemplatePickerModal`) | M2, and M1 by Vite's own injection | every tree | **canonical** for component-local structure. The registry test fails on a module left off the list; the document-only exemption is gone, because since P77-I "portaled" means the overlay root and `TemplatePickerModal`'s module was dead there until P79-B |
| `src/styles/builder.css` | M2 | every tree; read only in the overlay root where the Layout Builder paints | **canonical** for the Dockview bridge until P81 retires the `--mullion-builder-*` block |
| `src/styles/wpAdminFormReset.css` | M1 only | document only | **constrained** by design: the wp-admin reset targets light-DOM admin pages and is intentionally absent from every shadow tree |
| a framework sheet under `src/ui/` (`styles/base.css` so far; P79-C adds the component sheets) | M2 | every tree | **canonical** for framework components; three static tests hold each one to no colour literal, no `!important`, no ancestor scheme selector |
| Mantine `vars` (theme adapter or component prop) | M4 as custom properties | the element and Mantine's own rules that read the variable, including pseudo-state rules | **canonical** for colour and state on a Mantine part whenever Mantine exposes a variable for it (`--input-bd`, `--table-hover-color`, `--checkbox-color`, and so on) |
| Mantine `classNames` plus a stylesheet | whichever stylesheet | see the stylesheet | **canonical** for state and pseudo-state Mantine does not expose a variable for; the stylesheet must be `chrome-portable.scss` if the part can render in chrome |
| Mantine `styles` (theme adapter or component prop) | M4 as inline style | the element; pseudo-class and attribute keys are silently dropped (P76-I-1) | **constrained**: flat declarations only, and only when no `vars` route exists. Two tests enforce flatness, one for the adapter and one for the 14 component call sites |
| `adminChromeStyles()` (`chromeTheme.ts`) | M4 | Drawer and Modal `inner` and `content` | **legacy, load-bearing**: the only way theme tokens reach portaled chrome across the boundary (P76-H). Carries the full `--mantine-*` set and one `--mullion-*` token. Retired or generalised by P77-B |
| `--mullion-builder-*` inline block (`LayoutBuilderModal`) | M4 | the builder shell | **legacy, load-bearing**: Dockview is themed through `--dv-*` variables that must resolve inside a portal. Same fate as the row above |
| `MullionProvider` token sheet | M3 | every scope the provider paints, including the portal container in the overlay root | **canonical** for per-theme tokens everywhere; it replaced `ThemeContext`'s injection in P79-A |

Counting authoring surfaces after P79-B gives eleven again, with a different
composition: the document-only CSS module row is gone and the framework sheet
row is new. Counting mechanisms still gives four, but M2 now has one reach
("every tree the provider paints") instead of a per-file answer, which is the
collapse the framework study asked for. The remaining legacy surfaces exist
because Mantine's variables and overrides still have to reach portaled chrome,
which is Phase 81's removal, not this document's.

## 4. Which channel for which job

| Job | Write it as | Not as |
|-----|-------------|--------|
| Colour or state on a Mantine part that has a variable (`--input-bd`, `--input-bd-focus`, `--table-hover-color`) | `vars` in `adapter.ts` | `styles`, which pins the colour inline and outranks Mantine's own focus and checked rules |
| Pseudo-state or attribute state on a Mantine part with no variable (`:focus-visible` rings, `[data-active]`, `[data-checked]`) | a stable class through `classNames` plus a rule in `chrome-portable.scss` | a rule in `global.scss`, which never reaches portaled chrome |
| A themed colour that such a state rule must read | your own `--mullion-*` custom property, set through `vars` on the part's root (or inline on a part that portals on its own, such as a Select dropdown) and read by the rule with a fallback | an inline `color` through `styles` on the same part: inline outranks every class rule, including the state rule, so the state never shows (P77-C) |
| Overriding a Mantine class on anything that can render in chrome | `chrome-portable.scss`, class selectors only, doubled first class to clear Mantine's specificity | `global.scss`; element selectors or resets in `chrome-portable.scss`, which leaks into the host page |
| Structural layout in the gallery tree | `global.scss` under `.mullion-gallery`, or a CSS module registered in `src/appStyles.ts` | a CSS module you forgot to register; the registry test will tell you |
| Structural layout for a portaled surface | the same: a CSS module registered in `src/appStyles.ts`; the list reaches the overlay root | a module kept off the list because "it only portals"; that is exactly the tree it must reach |
| Static, state-free declarations on a Mantine part | `styles` with flat keys is acceptable | nested keys; both flatness tests fail on them |
| Per-theme tokens for gallery components | `--mullion-*` from the provider's token sheet | hardcoded hex; see the theme authoring guide |
| Per-theme tokens for portaled chrome | `--mullion-*` from the portal container's token sheet; the gallery's tokens under the root provider, the brand's under a nested `mode="lock"` provider whose container the chrome portals into | `adminChromeStyles()`, which survives only for the `--mantine-*` half until Phase 81 |
| A third-party library themed by CSS variables inside a portal | the inline variable bridge, as Dockview does | expecting M2 or M3 to reach it |

When in doubt, the question to ask is "which tree is the element in when it
paints?", and the answer decides the mechanism. The surface follows.

Two things delivery cannot fix, both found by P77-C. A rule for an attribute
Mantine does not set (`[data-selected]` on a Select option; Mantine 9 sets
`data-checked`) is dead in every tree, so check the rendered element's
attributes before writing the selector. And a class rule cannot beat an
inline declaration on the same element, so a part whose colour the adapter
pins through `styles` will never show a state colour from any stylesheet.

## 5. Tests that hold the contract

| Test | Guards | Mutation that fails it |
|------|--------|------------------------|
| `src/styles/__tests__/styleDelivery.test.ts`: global.scss scope | every `global.scss` selector carries `.mullion-gallery`; the known-dead allowlist it carried was emptied by P77-C | append an unscoped rule |
| same file: module registry | every `*.module.scss` is registered in `src/appStyles.ts`, no exemptions | add a module without registering it |
| `src/ui/__tests__/componentSheets.test.ts` (P79-B) | every `.css` and `.scss` under `src/ui/` carries no colour literal, no `!important` and no ancestor scheme selector, reported by file and line | add `color: #fff` to `base.css` |
| `src/ui/__tests__/uiStyles.test.ts` (P79-B) | the registration list keeps order, replaces by id, adopts once per root with reference counting, shares one constructable sheet between roots and rewrites it on late registration | break the refcount |
| same file: component `styles={}` flatness | no nested key in any component-level `styles` prop | add `'&:hover'` to any `styles={{}}` |
| `src/themes/__tests__/adapter.test.ts`: adapter flatness (P76-I-1) | the same rule for the theme adapter across all 23 themes | add a nested key to any component block |
| same file: state colours as variables (P77-C) | Tabs, SegmentedControl and Select carry their state colours as custom properties and no inline `color` on the tab, label or option | put `color` back in `Tabs.styles.tab` |
| `e2e/style-delivery.spec.ts` | with the Settings drawer open, every selector compiled from `chrome-portable.scss` and `global.scss` is present in the gallery root and the overlay root (adopted sheets included), the two roots hold the same parsed sheet object and no hand-written copy, a light-mount document adopts it once, the drawer's active tab and the Theme select's checked option paint their variables, and the template picker's module paints in the overlay root | drop a sheet from `src/appStyles.ts`; rename `data-checked` in the rule |
| `e2e/multi-instance-theme.spec.ts` (P79-A, extended in P79-B) | two hosts on one page resolve their own tokens with no bleed, and their four roots share one parsed component sheet | build the sheet per provider |
| `e2e/portal-mode.spec.ts` (P77-B) | under a transformed, overflow-hidden host wrapper with the page scrolled, `?portal=overlay-root` keeps the drawer at the viewport origin, keeps a host `button` rule off it, dismisses on Escape and click outside, ignores the flag on a light mount, and styles the Layout Builder | point the geometry test at `?portal=shadow`; drop Dockview from `src/appStyles.ts` |
| `e2e/theme-qa.spec.ts`: focus ring pair (P76-I-2, P77-F) | on every tabbable control in the drawer, in both mount modes and both chrome modes, the painted ring is a 2px `primaryStroke` core plus a 6px `--mullion-color-focus-halo` box-shadow, and the halo token reaches the element | drop a selector from the ring rule; remove the halo from `chromeVars()` |

The e2e spec needs the gallery dev server on the configured port. Note that
`playwright.config.ts` reuses any server already listening there, whatever it
is serving, so a stray dev server from another project produces a confusing
timeout rather than a clear error.

## 6. Embedding guidance that still applies

**Scope everything under `.mullion-gallery`.** WordPress themes apply global
CSS freely. Under a light mount our rules and theirs share one document, so a
bare `button` or `img` rule in `global.scss` would restyle the host page. The
scope test above enforces this; `chrome-portable.scss` is the one deliberate
exception, which is why it may contain Mantine class selectors only.

**No resets outside the root.** `* { box-sizing }` and base typography live
under `.mullion-gallery`, never at `:root` or `body`.

**Theme through CSS variables.** Colours, radii, shadows and typography are
`--mullion-*` custom properties generated per theme by the theme engine and
written by `MullionProvider` into every scope it paints, the portal container
included. Components read the variable, never a hex.

**Keep CSS modules for component structure**, and register them in
`src/appStyles.ts`; the list reaches every tree, so there is no longer a
"which tree" question to answer for a module.

**One z-index token.** `--z-header: 40` is set on `.mullion-gallery` in
`global.scss` and read by the sticky gallery header and both auth-bar
variants. Portaled chrome takes Mantine's own `--mantine-z-index-*` scale.

**Narrow embeds.** `.mullion-gallery--compact` on the root reduces the
container max-width and horizontal padding.

**Shadow DOM versus iframe.** Shadow DOM gives strong CSS isolation in the
same JS context at the cost of the boundary this document is about. An iframe
gives total isolation and needs cross-window messaging for everything else;
it is not implemented and not planned. Dropping shadow DOM was considered and
rejected in Phase 77 (Key Decision C): it is the only protection against host
CSS the plugin cannot obtain any other way.

**Where this contract goes next.** Phase 77 track E
([UI_DEPENDENCY_EVALUATION.md](../UI_DEPENDENCY_EVALUATION.md)) recommended
replacing Mantine with an in-house component layer on headless primitives
behind the Phase 78 facade, and track H
([IN_HOUSE_UI_FRAMEWORK_STUDY.md](../IN_HOUSE_UI_FRAMEWORK_STUDY.md))
described the styling model that follows: no third-party CSS, state as data
attributes, colour only as tokens, one stylesheet registered in every tree.
Phase 79 built the last of those (P79-A tokens, P79-B delivery); Phases 80
and 81 replace the components and delete the Mantine channels. Until then this
guide is the contract, and every channel in it stays canonical for the code
that exists.

Document rewritten 2026-09-09 for Phase 77 track A and updated the same day
for tracks C and B; pointer to tracks E and H added 2026-09-10, and the portal
default updated for track I the same day; M2 and M3 rewritten 2026-09-12 for
Phase 79 tracks A and B. The previous version
(January 2026) predates the shadow-plus-portal findings of Phases 75 and 76
and described CSS variables as scoped to `.mullion-gallery`, which has not
been true since the shadow mount became the default.
