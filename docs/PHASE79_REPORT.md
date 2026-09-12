# Phase 79 - Framework core and theme manager

**Status:** In progress (P79-A landed)
**Created:** 2026-09-10
**Last updated:** 2026-09-12 (P79-A landed)

### Tracks

| Track | Description | Status | Effort |
|-------|-------------|--------|--------|
| P79-A | `MullionProvider`: scope, portal container, lock and follow mode, persistence, runtime theme registration | **Done** (2026-09-12), see notes | Medium-Large |
| P79-B | Style delivery and the token sheet: one registration list written into every tree the plugin owns | Planned | Medium |
| P79-C | Layout and typography primitives, and the single focus rule | Planned | Medium |
| P79-D | Theme manager merge: registry, catalogue, selector, scoping, lock and follow | Planned | Medium |

---

## Rationale

1. **What this phase builds.** `@mullion/ui`, up to but not including anything with interaction behaviour. The provider, the delivery mechanism, the tokens, the presentational primitives and the focus rule. It is the half of the framework that has no keyboard handling in it, which is why it can be built and proved before the primitive's components arrive in Phase 80.

2. **Why the provider is the centre.** Five separate pieces of today's code exist because Mantine's provider does not model what this plugin needs: `ThemeContext` (registry, persistence, scoping, variable injection), `OverlayRootSync` (mirroring variables into the overlay root), `AdminChromeProvider` (the nested lock-mode provider with its hidden sentinel element), `chromeTheme.ts` (`adminChromeStyles()`, the inline token bridge across the portal boundary), and the `--mullion-builder-*` block. Every one of them is a workaround for the same absence. One provider that owns scope, portal container and theme resolution replaces all five, which is what the user meant by merging the Theme Manager with the theming implementation.

3. **Why the theme manager merges here and not later.** It is provider state. Splitting it into a later phase would mean building the provider with a seam for something that is going to live inside it, which is the guess this project keeps deciding not to make.

4. **Why no components with behaviour yet.** The primitive is chosen in P78-B and its components arrive in Phase 80. Mixing them into this phase would make the provider's correctness contingent on the primitive's, and the provider is the thing everything else depends on. It is proved against presentational components and the existing Mantine tree, both of which already work.

5. **Success.** A component can read one token and be correct in the gallery tree, in the overlay root, in the wp-admin light-DOM apps, under a locked brand palette and under a followed gallery theme, without anything being carried inline. The five workarounds above are deleted or scheduled for deletion with a named replacement.

## Key Decisions

| # | Decision | Resolution |
|---|----------|------------|
| A | Does the provider replace `MantineProvider` or sit beside it? | **Beside it, for this phase.** Mantine's provider still runs, because the app is still full of Mantine components. `MullionProvider` owns the tokens and the portal container; Mantine's owns its own variables until Phase 81 removes it. Two providers briefly, one boundary. |
| B | Colour scheme as an attribute or a token? | **A token plus a `color-scheme` declaration on the scope.** Never an ancestor attribute selector. This is study principle 4 and it is what makes the P76-D/H class of defect impossible: a rule that keys on an ancestor fails the moment the element is portaled away from it. |
| C | How does CSS reach three different trees? | **One registration list, written per scope, preferring `adoptedStyleSheets`.** The P77-A contract's four mechanisms collapse to one because there is no third-party stylesheet to override and no "portable" sheet distinct from the rest. |
| D | Does `applyThemeEverywhere` stay a nested provider? | **No. It becomes a `mode` prop.** `AdminChromeProvider` exists because Mantine's scheme attribute and variable selector had to be re-declared for a subtree. A provider that takes `mode="lock"` needs no nesting trick and no hidden sentinel element, and it cannot drop focus by moving children between tree depths the way P76-F had to fix. |
| E | Runtime theme editing in this phase? | **The API, yes; the editor UI, no.** `defineTheme` with the audits running at save is provider surface and belongs here. A user-facing theme editor is a product feature and is not scheduled. |
| F | What happens to `adminChromeStyles()` and the builder bridge? | **Both retire when the overlay root carries the provider's own sheet.** That is this phase's P79-B, which is why P77-I flips the default first. Until then they stay load-bearing and are not touched. |

## Execution Priority

1. **P79-A** first. Everything else is a consumer of it.
2. **P79-B** next, because a token nobody can read is not a token. A and B together are the minimum that proves anything.
3. **P79-C** third. The primitives are simple, and the focus rule is the one visible thing this phase ships.
4. **P79-D** last, and only once A is stable. It moves live behaviour (persistence, scoping, switching) that the plugin depends on today, so it is the track most able to break a working feature.

---

## Track P79-A - `MullionProvider`

### Problem

Theme resolution, variable emission, colour scheme, portal container, lock and follow, persistence and per-instance scoping are spread across `ThemeContext`, `OverlayRootSync`, `AdminChromeProvider`, `chromeTheme.ts` and `main.tsx`. Each was added to work around something Mantine's provider does not model, and together they are why a token can reach one tree and not another.

### Fix

One provider, with the shape in the study's section 3.2: `theme`, `scope`, `mode`, `portal`, `persistence`, `instanceId`. It resolves the theme through the engine, emits the token sheet into its scope, sets `color-scheme`, provides the portal container to every overlay, and exposes the registry and switching API.

Nested providers merge scope, never theme objects. That removes the `deepMerge` class of trap entirely: there is no theme object being spread, so a DOM element cannot be turned into a plain object by a merge.

### Acceptance criteria

- One provider serves all four cases: gallery shadow mount, gallery light mount, overlay root, wp-admin light DOM.
- `mode="lock"` renders the brand palette and `mode="follow"` the gallery theme, with an identical element tree in both states, so flipping the mode cannot unmount a subtree or drop focus (the P76-F guarantee, kept by construction rather than by care).
- Per-instance scoping works on a multi-space page: two providers, two token sets, no bleed.
- `defineTheme` registers a runtime theme and refuses one that fails the contrast audits.
- No `[data-*-color-scheme]` ancestor selector exists anywhere in the framework, enforced by a static test.

### Validation

- Unit tests per responsibility, and a jsdom test asserting the lock and follow trees are structurally identical.
- An e2e test on a two-instance page asserting independent themes.
- Mutation: making the scheme a selector instead of a token must fail the static test.

---

## Track P79-B - Delivery and the token sheet

### Problem

CSS reaches an element through four mechanisms with different reach, and eleven authoring surfaces sit on top of them ([STYLING_GUIDE.md](guides/STYLING_GUIDE.md)). Every legacy surface in that table exists because a stylesheet lives in one tree and an element renders in another.

### Fix

One `uiStyles.ts` registration list concatenating the framework's component sheets and the gallery structural sheet. The provider writes it into every scope it owns, building the sheet once with `replaceSync` and adopting it where `adoptedStyleSheets` is available, falling back to a `<style>` element. The token sheet is emitted per scope and is small.

This is also the FUTURE_TASKS item "Share One Constructable Stylesheet Between the Gallery Root and the Overlay Root", which stops being a separate optimisation once delivery is written once.

**Backlog cleanup owned by this track.** When P79-B is closeable, delete that entry from [FUTURE_TASKS.md](FUTURE_TASKS.md) (Code Quality and Refactoring) and note the removal in the document's update log. It is deliberately left in place until then, because the entry describes a real gap for as long as the overlay root keeps its own `<style>` copy.

### Acceptance criteria

- Every framework stylesheet reaches the gallery tree, the overlay root and the document, proved in the browser rather than by reading imports.
- The P77-A guards carry over: every selector scoped, every sheet registered, no inline pseudo-state.
- Three new static tests from study principle 2: no colour literal in a component sheet, no `!important`, no ancestor scheme selector.
- One parsed sheet per page rather than one per mount, measured.
- The FUTURE_TASKS constructable-stylesheet entry is deleted in the same change that closes this track.

### Validation

- `e2e/style-delivery.spec.ts` extended to the new sheets, in both mount modes.
- Mutation: a colour literal added to a component sheet must fail the static test by file and line.

---

## Track P79-C - Layout primitives, typography and the focus rule

### Problem

Thirty of the 62 components in use are presentational: they have no keyboard behaviour, no ARIA state and nothing to buy from a primitive. They are also the most-used, with `Text` in 98 files, `Stack` in 83 and `Group` in 76. They can ship before the primitive is even installed.

The focus ring is here too, because it is one rule and it is the single most visible thing the framework owns.

### Fix

Build the presentational set listed in the study's section 4, reading tokens only. Layout primitives take a small prop set that renders as inline custom properties, so the value travels with the element into any tree; Mantine's full style-prop surface is deliberately not reproduced.

One focus rule on `[data-focus-visible]`: a 2px core in `--mullion-color-primary-stroke` inside a 6px halo in `--mullion-color-focus-halo`, both geometry values from the framework constants P78-C added.

### Acceptance criteria

- The presentational set renders correctly in all four scopes.
- The P77-F ring walk passes against framework components, all four combinations of mount and theme mode, asserting core colour, 2px width, the halo token present and the exact 6px halo.
- Every component sheet passes the three static tests from P79-B.
- Storybook covers the set, with the decorator on `MullionProvider` rather than Mantine's.
- The drawer header clears the WordPress admin bar via the host-safe layer token from P78-C, and the FUTURE_TASKS entry for it is deleted in the same change.

### Validation

- `npx vitest run`, the ring walk in `e2e/theme-qa.spec.ts`, and a visual pass at 2x on tight layouts, as P77-F did.

---

## Track P79-D - Theme manager merge

### Problem

The registry, the catalogue, switching, persistence, per-instance keys and lock and follow live in `src/themes/index.ts`, `src/contexts/ThemeContext.tsx`, `src/components/Admin/ThemeSelector.tsx`, `src/themes/chromeTheme.ts` and `AdminChromeProvider.tsx`. The user named merging these with the theming implementation as a requirement of the framework.

### Fix

Move them into the framework as provider surface, keeping the behaviour the plugin depends on exactly as it is: the four-step initial-theme priority (user choice, instance default, host-injected candidate, default), the admin persistence lock, the scoped storage key, and the catalogue grouping the WordPress settings field shares.

`ThemeSelector` becomes a framework component reading the registry, and stops importing the registry from app code.

### Acceptance criteria

- The initial-theme priority order is unchanged, covered by the existing tests moved with it.
- Persistence, the admin disable flag and the per-instance key behave identically, proved by the existing `ThemeContext` suite running against the new implementation.
- `getTheme` stays an O(1) map lookup; registry initialisation stays under 100ms for 23 themes.
- No app file imports a theme registry directly.

### Validation

- The existing theme suites, re-pointed and unchanged in their assertions wherever the behaviour is meant to be identical.
- `theme-qa` end to end: switch theme, reload, confirm persistence, in both mount modes.

---

## Follow-On Candidates

| Candidate | Why it is deferred |
|-----------|--------------------|
| Components with interaction behaviour | Phase 80. This phase deliberately ships nothing that handles a keypress. |
| Deleting `AdminChromeProvider`, `chromeTheme.ts`, `ThemeContext` | Phase 81. They keep serving Mantine components until those are gone. |
| A user-facing theme editor UI | Key Decision E. The API lands here; the product feature is unscheduled. |
| Host-safe layer wired from PHP so the admin bar stops covering the drawer | The token ships in P78-C and the framework reads it here. Wiring the PHP side is a small follow-on, and it closes a FUTURE_TASKS accessibility entry. |

## Implementation Notes

### P79-A (2026-09-12)

**Status: landed.** The provider is [`src/ui/provider/MullionProvider.tsx`](../src/ui/provider/MullionProvider.tsx), with the engine-only registry, the token sheet and its delivery, scope ids and persistence as sibling modules, all exported from the `@/ui` barrel. It is wired into `main.tsx` beside `MantineProvider` for every gallery mount, and it now owns the `--mullion-*` token sheet for the gallery tree and the overlay root. Four unit suites, one static guard and one new e2e spec cover it; six mutations were applied and caught.

**What the provider does, in one rule.** Every element it paints, inline child or portaled overlay, sits under an element carrying its tokens, and the tokens reach that element by a stylesheet written into whichever tree the element is in. The scope gets a sheet keyed on `:host` (a shadow root), `:root` (the document) or `[data-mullion-scope="id"]` (an element, or the `display: contents` wrapper the provider renders when no scope is given). The portal container gets the same tokens keyed on its own `data-mullion-scope`, written into the container's root, which under the shipped mount is the overlay root. A nested provider's container is created inside its parent's, so a locked drawer's overlays land in a container carrying the locked tokens and a followed one's in a container carrying the gallery's, with nothing inline. That is the mechanism `adminChromeStyles()` and the builder bridge exist to fake, and P79-B retires them against it.

**What the measurement changed about the plan.**

| Plan said | Built |
|-----------|-------|
| "One provider serves all four cases: gallery shadow mount, gallery light mount, overlay root, wp-admin light DOM" | The first three are wired in `main.tsx` and measured in the browser. The fourth is proved by the element-scope unit test and **not wired**: `SpacesAdminApp` and `GlobalAssetAdminApp` render Mantine's default theme with no component reading a token, so a provider there would only flip `color-scheme` on the host element with nothing to show for it. They get the provider when P81-B migrates their surfaces. Recorded as a deliberate omission rather than an oversight. |
| `scope={element \| shadowRoot \| 'document'}` | Those three plus omitted, which renders a `display: contents` wrapper carrying the attribute. A nested provider needs no DOM of its own, and custom properties inherit through a boxless element. |
| `mode` replaces `AdminChromeProvider` | The mode is built and proved, and `AdminChromeProvider` stays. The Mantine components inside it still read `--mantine-*` from its nested `MantineProvider`, which is Phase 81's removal, not this track's. The provider's `mode` is what P81 migrates onto. |
| Persistence "with the same priority order (user choice, instance default, host-injected candidates, default)" | User choice, then the `theme` prop, then the brand theme. The host-injected candidates (`resolveWpThemeIds`) are WordPress glue the app passes in, and moving that seam is P79-D's job; nothing in the provider prevents it. Persistence is off unless `persistence` is given, so the app wiring, where `ThemeContext` still owns the choice, cannot double-write storage. |
| "exposes the registry and switching API" | An engine-only registry in `src/ui/provider/registry.ts`: merge onto base, validate, `resolveColors`, audit. The app registry in `src/themes/index.ts` keeps running beside it for Mantine, so the 23 themes are resolved twice at startup for the rest of this phase. Measured, see validation. |
| `defineTheme` "refuses one that fails the contrast audits" | Both audits (1.4.3 text and 1.4.11 non-text, including the P77-F ring pair) run at `defineTheme` and the result carries every failing pair. Bundled themes are audited too but only warned about in dev, because the engine's own suite already holds all 23 to zero failures and removing a shipped theme at runtime would be a worse failure than the one it reports. |
| Delivery "preferring `adoptedStyleSheets`" | Built, with the `<style>` fallback. jsdom 25 has neither `adoptedStyleSheets` nor `replaceSync`, so the unit suite runs the fallback and the constructable path is proved against a stubbed shadow root; Chromium in the e2e runs the real thing. |

**Design decisions taken while building.**

- *Two contexts for theme, not one.* `useMullionTheme()` is the switching API and is always the root's, passed through unchanged by nested providers. `useMullionScope()` is what the nearest provider paints. They differ inside locked chrome, where the theme selector must switch the gallery while the drawer stays on the brand palette, which is exactly the product's behaviour today and the reason `AdminChromeProvider` has to reach for `useTheme()` above itself.
- *Follow inherits from the nearest scope, not from the root.* A follower under a lock paints the lock. That is what "inherits" means, and it is the only reading under which nesting composes.
- *The default mode for a nested provider is `lock`.* It matches the product default (`applyThemeEverywhere: false`) and it is the safer surprise: a nested provider with no props paints the brand palette, which is visibly wrong if unintended, rather than silently doing nothing.
- *A definition passed as `theme` is registered during render.* The entry is in the map at once, which is what that render needs; the registry's change signal is deferred a microtask so a `useSyncExternalStore` subscriber is never updated while another component renders. A refused definition warns and paints the brand theme rather than throwing, because a theme is data and bad data should not take the gallery down.
- *Hooks throw outside a provider.* `useTheme()` returns a warned fallback. A framework component with no tokens is a bug, and a fallback would paint it wrong without saying so.
- *Scope ids are generated, not `useId`.* React 19's `useId` values need escaping in a selector and jsdom has no `CSS.escape`. A counter with an optional sanitised hint (`mullion-gallery-a-3`) is CSS-safe by construction and readable in devtools.

**What was deleted or retired, with its replacement.**

| Removed | Replaced by |
|---------|-------------|
| `ThemeContext`'s two injection paths (shadow root `<style>`, scoped document `<style>`), their three props and four tests | The provider's sheet, in `main.tsx`. `ThemeContext` keeps the theme id, persistence and switching until P79-D. |
| `src/utils/themeScope.ts` and its test | Nothing: its only consumers were the injection above. |
| The overlay root's `#mullion-theme-vars` element and `syncOverlayThemeVars()` | The provider writes the overlay target's sheet into the overlay root. `OverlayRootSync` now mirrors only Mantine's variables, until Phase 81. |
| Two `theme-qa` e2e checks that read a `<style>` by id | The same checks reading the computed `--mullion-color-background` on the shadow host against the theme JSON. Under `adoptedStyleSheets` there is no element to read, and measuring reach was the better test anyway. |

**Three defects introduced and caught.**

1. The portal container's `data-mullion-scope` was stamped in a layout effect, so a consumer reading it during the first render saw an empty string. The provider's own container now carries the attribute from creation; only a caller-supplied container is stamped in the effect, and the test records that a consumer sees it one render later.
2. `defineTheme` notified subscribers synchronously, which would have fired a `useSyncExternalStore` update during another component's render whenever a provider was handed a definition. Deferred a microtask; the registry test pins both halves (entry visible at once, signal one tick later).
3. The two-instance e2e page was first written as a hand-rolled HTML document served from a route. Vite injects the React refresh preamble into HTML it transforms, and a page it never sees makes the entry module throw in dev. The route now fetches the dev server's own index, as transformed, and splices the two hosts into it.

**Rendered output.** The gallery tree and the overlay root receive the same `--mullion-*` declarations they received before, from a different emitter. The `color-scheme` declaration is new on the scope but matches what Mantine's `forceColorScheme` already sets on the same element. `theme-qa`'s snapshot matrix is the check, see validation.

**One finding the re-pointed e2e produced.** `theme-qa` had a test titled "WP injected `__mullionThemeId` overrides localStorage stored theme" whose only assertion was that a style element's text contained `:host`, which is always true. Re-pointed at the computed background token, it failed: with a stored choice of tokyo-night and an injected cyberpunk, the page resolves tokyo-night. That is the documented priority in `ThemeContext` (the user's stored choice wins while the admin allows overrides; the injected id wins once `allowUserThemeOverride` is false), so the title was wrong and the code was right. The test is now two tests, one per half of that rule, and `installThemeSession` gained an `allowUserThemeOverride` option to drive the second. P79-D's "the initial-theme priority order is unchanged" criterion now has a browser-side pin it did not have before.

**Mutations.** Each applied alone against the guarding suite and restored byte-identical afterwards.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| the static scheme-selector test | `[data-mullion-color-scheme="dark"]` added to a framework source | fails naming the file and line |
| the same, on emitted CSS | `buildTokenSheet` keys `color-scheme` on `selector[data-mullion-color-scheme]` | the static test fails for all 23 themes and the sheet test fails |
| the sheet carries the declaration | `color-scheme` declaration dropped from the sheet | the sheet test fails |
| P76-F structural identity | follow mode renders children bare, no wrapper | the "identical element tree in both modes" test fails |
| audits are guards | the audit gate removed from `defineTheme` | three tests fail: text audit, non-text audit, and the provider's refused-definition case |
| first-render container identity | the own container's scope attribute stamped only in the effect (defect 1 above, re-applied) | three tests fail, the first-render probe among them |
| per-instance isolation | element scopes keyed on `:root` | the element-scope test fails on the `:root` sheet it forbids |

**Registry cost.** With the engine already loaded, evaluating `registry.ts` (merge, validate, `resolveColors` and, in dev, both audits for all 23 themes) takes 80ms in three runs under vitest's jsdom. Production skips the bundled audits, so the app pays under that at startup for the second registry, on top of the app registry's own pass, until Phase 81 removes the latter. The P79-D bar is 100ms.

**Validation.** Run at CI parity on the final tree: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run ui:allowlist:check` green at 178 files (the provider adds no Mantine importer), `npm run test:coverage` 4,052 of 4,052 across 265 files with every threshold met (statements 86.33, branches 75.09, functions 82.52, lines 88.36), `npx playwright test` 49 of 49 with no snapshot differences, and `npm run build` clean apart from the pre-existing chunk-size warnings. The suite grew by 33 unit tests net (the four provider suites minus the four injection tests retired with `ThemeContext`'s emitter and the deleted `themeScope` suite) and by three e2e checks. The 19 `theme-qa` checks include the twelve snapshot comparisons, which is the criterion this track's app wiring was measured against: zero baseline movement.

**Acceptance criteria, checked.**

| Criterion | Where it is proved |
|-----------|--------------------|
| One provider serves the four cases | Shadow mount, light mount and overlay root: `e2e/multi-instance-theme.spec.ts` in the browser, `MullionProvider.test.tsx` "scope" and "portal" blocks in jsdom. wp-admin light DOM: the element-scope unit test only; not wired, see the plan table above. |
| Lock paints the brand palette, follow the gallery theme, identical tree, focus kept | "lock and follow" block, four tests; mutation M4 |
| Two providers, two token sets, no bleed | "per-instance scoping" block and both e2e cases; mutation M7 |
| `defineTheme` registers and refuses on audit failure | `registry.test.ts` and the "runtime themes" block; mutation M5 |
| No `[data-*-color-scheme]` ancestor selector, by static test | `noSchemeSelector.test.ts`; mutations M1 and M2 |

## Outcome

_P79-A landed 2026-09-12; B, C and D pending._
