# Phase 79 - Framework core and theme manager

**Status:** Complete (P79-A, P79-B, P79-C and P79-D landed)
**Created:** 2026-09-10
**Last updated:** 2026-09-12 (P79-D landed)

### Tracks

| Track | Description | Status | Effort |
|-------|-------------|--------|--------|
| P79-A | `MullionProvider`: scope, portal container, lock and follow mode, persistence, runtime theme registration | **Done** (2026-09-12), see notes | Medium-Large |
| P79-B | Style delivery and the token sheet: one registration list written into every tree the plugin owns | **Done** (2026-09-12), see notes | Medium |
| P79-C | Layout and typography primitives, and the single focus rule | **Done** (2026-09-12), see notes | Medium |
| P79-D | Theme manager merge: registry, catalogue, selector, scoping, lock and follow | **Done** (2026-09-12), see notes | Medium |

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
| F | What happens to `adminChromeStyles()` and the builder bridge? | **Both retire when the overlay root carries the provider's own sheet.** That is this phase's P79-B, which is why P77-I flips the default first. Until then they stay load-bearing and are not touched. *P79-B note:* the precondition is now met, the overlay root carries both the token sheet and the component sheet by provider. What still keeps `adminChromeStyles()` alive is its `--mantine-*` half, which Mantine components read until Phase 81; the deletion stays homed there (Follow-On Candidates). |

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
| ~~Host-safe layer wired from PHP so the admin bar stops covering the drawer~~ | **Done in P79-C**, not deferred. This row and the P79-C acceptance criterion disagreed about whether the PHP side belonged here; the criterion won, because the FUTURE_TASKS entry cannot close until the drawer actually clears the bar. The drawer reads `uiLayer('modal')` and the embed raises `--mullion-layer-host-offset` when the admin bar is showing. |

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


### P79-B (2026-09-12)

**Status: landed.** One registration list, [`src/ui/styles/uiStyles.ts`](../src/ui/styles/uiStyles.ts), with the app's entries in [`src/appStyles.ts`](../src/appStyles.ts). The list is built once per page into a constructable `CSSStyleSheet` that `MullionProvider` adopts into every root it paints, with a `<style data-mullion-ui-styles>` fallback where a tree has no `adoptedStyleSheets`. The three hand-written writers (`main.tsx` twice, `portalTarget.ts` once) and the two lists they read (`shadowStyles`, `overlayStyles`) are gone. The token sheet gained the study's one motion switch. Two unit suites, one static guard and three extended e2e specs cover it; the FUTURE_TASKS entry is deleted.

**What delivery does, in one rule.** A sheet on the list reaches every tree the provider paints, and no sheet reaches a tree any other way. The provider already knew every root it painted (the scope's root and the portal container's root, from P79-A), so delivery is the same reconciliation with a second sheet: adopt the shared sheet into each root on first sight, reference-counted so nested providers in one tree adopt once, release on unmount. Registration after adoption calls `replaceSync` on the shared sheet and every root sees the change; a lazily loaded chunk can add to the list without touching a root.

**What the measurement changed about the plan.**

| Plan said | Built |
|-----------|-------|
| "One `uiStyles.ts` registration list concatenating the framework's component sheets and the gallery structural sheet" | The framework's list holds the framework's sheets (`styles/base.css` so far) and exposes `registerUiStyles`; the app registers the vendor, structural and module sheets in `src/appStyles.ts` at load. One list, two contributors, because the framework cannot import app CSS without inverting the dependency the P78-A boundary exists to hold. |
| "building the sheet once with `replaceSync` and adopting it where `adoptedStyleSheets` is available, falling back to a `<style>` element" | As planned, and measured: the gallery root and the overlay root hold the same `CSSStyleSheet` object; on the two-instance page four roots hold one. Chromium never takes the fallback; jsdom always does, which is how the unit suite exercises it. |
| "The token sheet is emitted per scope and is small" | Unchanged, plus the reduced-motion switch (below). |
| Study 3.3: "no third-party CSS", so the list needs no notion of layers | **Mantine's two sheets are registered inside `@layer mullion.vendor`.** An adopted sheet cascades after every `<style>` in its tree, and Mantine's `styles.css` declares its default variables at `:root, :host` for its own runtime variables sheet to override at the same selector by coming later. Unlayered, the defaults won again: the full e2e run failed three axe contrast checks with the theme's dimmed text reverted to Mantine's `#828282` (`--mantine-color-dark-2`). Layered declarations lose to unlayered ones whatever the order, which is the one property that makes a vendor sheet adoptable. `registerUiStyles` takes a `layer` option for exactly this; the framework's own sheets do not use it. Phase 81 deletes both lines. |
| The framework's first sheet | `base.css` declares `@layer mullion.vendor, mullion.base, mullion.components;` and nothing else. The layer order is a delivery concern (it must be declared before any layered rule, so it goes first on the list); the rules that fill the framework layers are P79-C's components. The static tests and the e2e reach checks run against it now, so P79-C's sheets land under guards that already exist. |

**Design decisions taken while building.**

- *Every sheet in every tree, including the ones nothing reads there.* Dockview and `builder.css` were overlay-only; the gallery tree now carries them too. With one parsed sheet per page the marginal cost is selector matching on unused rules, and the alternative is a second list with its own reach, which is the P77-A contract this track deletes.
- *The document is a painted tree too.* Under a light mount the provider adopts the list into the document, where Vite has already injected most of the same sheets for the wp-admin apps. That is two copies in the document for the rest of the phase, one of them adopted, and it is deliberate: the provider's mechanism must be the same in every mount, and the Vite copies leave with Mantine in P81 rather than with a special case here. The light-mount `import('./styles/global.scss')` calls are gone because the list carries it.
- *No document-only exemption for CSS modules.* The P77-A registry test allowed a module off the list when its only consumer portaled. Since P77-I "portaled" means the overlay root, which the list reaches and Vite's document injection does not, so the exemption named the one tree the module could not reach. `TemplatePickerModal.module.scss` is on the list and the exemption is deleted.
- *Reduced motion is a token switch in the token sheet, not a rule in a component sheet.* Under `prefers-reduced-motion: reduce` the scope's three `--mullion-duration-*` tokens become `0ms`, on the same selector, so any reader of a duration token honours the preference without a rule of its own. It lives in the token sheet because a component-sheet override in a cascade layer would lose to the unlayered token declaration.
- *`registerUiStyles` replaces by id.* A module that re-registers (hot reload, or the same chunk evaluated twice) does not append a second copy, and its position in the cascade is kept.

**What was deleted or replaced, with its replacement.**

| Removed | Replaced by |
|---------|-------------|
| `src/shadowStyles.ts` (`shadowStyles`, `overlayStyles`) | `src/appStyles.ts`, registrations into the framework list |
| `main.tsx`: the `<style data-mullion>` writer in `mountWithShadow` and in `mountSharedRoot`, and three light-mount `import('./styles/global.scss')` calls | the provider adopting the list into the scope's root |
| `portalTarget.ts`: the overlay root's `<style data-mullion>` copy of `overlayStyles` | the provider adopting the list into the portal container's root |
| `styleDelivery.test.ts`: `DOCUMENT_ONLY_MODULES` and its two tests | "every module is registered", no exemptions, plus a check that the list names no missing file |
| FUTURE_TASKS "Share One Constructable Stylesheet Between the Gallery Root and the Overlay Root" | this track; removal logged in the document's update log |

**Two findings from the baseline measurement.**

1. *A responsive style prop that set the same property as a Mantine core rule lost at the base breakpoint, until now.* Measured on the tree before this change: the gallery shadow root's children were four `style[data-precedence=mantine]` elements, then `style[data-mullion]`, then the mount point. React 19 inserts the first hoisted style of a precedence as the root's first child, so `Card` with `p={{ base: 'sm', md: 'md' }}` (four sites in `AccessTab`) resolved core's `padding: var(--card-padding)` at every width; `Container` and `Center` with `py={{ ... }}` were unaffected because their core rules set no padding. With Mantine's sheet in the vendor layer the hoisted rule wins, as Mantine intends, so those four cards now take `sm` padding below the `md` breakpoint. Desktop snapshots do not see it; a data point is recorded in P81-A, where the style props migrate.
2. *`TemplatePickerModal.module.scss` was dead in the shipped mount from P77-I to P79-B.* Its hover glow rules were document-only by exemption while the modal painted in the overlay root. Measured on a worktree at the previous commit with the new e2e: the template card's computed `transition-property` was `all`, the initial value, where the module sets `box-shadow, transform, border-color`. Fixed by the list; the same test passes on this tree.

**Rendered output.** The same rules reach the gallery tree and the overlay root as before, from an adopted sheet rather than a `<style>`. Two cascade relationships changed, both by the vendor layer: Mantine's core sheet now loses to every unlayered rule in the tree instead of to those that happened to follow it, which is what the runtime variables sheet, the hoisted responsive rules and `chrome-portable.scss` all wanted. Everything of ours that overrode Mantine already did so by specificity or by order and still does. The light-mount document additionally holds the adopted copy after Vite's; the Vite copy is unlayered and keeps beating host CSS there. `theme-qa`'s snapshot matrix and the axe contrast checks are the check, see validation.

**Mutations.** Each applied alone against the guarding suite and restored byte-identical afterwards.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| no colour literal (static) | `color: #fff` appended to `base.css` | fails naming `styles/base.css:16: #fff` |
| no `!important` (static) | `!important` appended to `base.css` | fails naming the file and line |
| no ancestor scheme selector (static, both guards) | `[data-mullion-color-scheme="dark"] .x` appended to `base.css` | the sheet guard and the P79-A source guard both fail, each naming the line |
| every module registered | the template picker's registration removed from `appStyles.ts` | the registry test fails naming the module |
| reference counting | release removes the sheet regardless of remaining holders | the fallback test and the light-mount two-provider test fail |
| every painted root | the provider adopts only into the first root (the scope), not the container's | the "scope root and container root" test fails on the overlay root |
| the motion switch | the reduced-motion block dropped from `buildTokenSheet` | the reduced-motion test fails on the missing block, and the token-sheet shape test fails |
| one sheet per page | a new `CSSStyleSheet` per adopting root | the unit test fails on object identity; in the browser `style-delivery` fails on the shared object and `multi-instance` reports four distinct objects for four roots |

**Validation.** Run at CI parity on the final tree: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run ui:allowlist:check` green at 178 files (`appStyles.ts` replaces `shadowStyles.ts` on the list at the same count), `npm run test:coverage` 4,065 of 4,065 across 267 files with every threshold met (statements 86.32, branches 75.17, functions 82.66, lines 88.32), `npx playwright test` 51 of 51 with no snapshot differences, and `npm run build` clean apart from the pre-existing chunk-size warnings. The suite grew by 13 unit tests net (two new suites and the provider, token-sheet and registry additions, minus the two document-only tests retired from `styleDelivery.test.ts`) and by two e2e tests, with three existing e2e checks extended. The first full run, before the vendor layer, failed exactly the three axe contrast checks in `e2e/accessibility.spec.ts` and nothing else, which is how the Mantine defaults regression was found; the run after the layer passed all 51.

**Acceptance criteria, checked.**

| Criterion | Where it is proved |
|-----------|--------------------|
| Every framework stylesheet reaches the gallery tree, the overlay root and the document, proved in the browser | `e2e/style-delivery.spec.ts`: the layer statement from `base.css` is the first rule of exactly one adopted sheet in the gallery root and in the overlay root under a shadow mount, and in the document under a light mount; `global.scss` and `chrome-portable.scss` selectors present in each; Dockview rules present in both shadow trees |
| The P77-A guards carry over | `styleDelivery.test.ts`: scope test unchanged, registry test re-pointed at `src/appStyles.ts` with the exemption removed, flatness test unchanged |
| Three static tests: no colour literal, no `!important`, no ancestor scheme selector | `src/ui/__tests__/componentSheets.test.ts`, by file and line, over every `.css`/`.scss` under `src/ui/`; mutation M1 |
| One parsed sheet per page rather than one per mount, measured | `style-delivery`: the gallery root and the overlay root hold the same `CSSStyleSheet` object, no hand-written copies, no fallback elements. `multi-instance-theme`: two mounts, four roots, one object. `uiStyles.test.ts`: `replaceSync` called once for two roots |
| The FUTURE_TASKS entry is deleted in the same change | `docs/FUTURE_TASKS.md`, entry removed and logged |
| Validation: `e2e/style-delivery.spec.ts` extended, both mount modes | Two new shadow-mount tests and the light-mount test extended; every reader of a tree's sheets now includes `adoptedStyleSheets` |
| Validation: a colour literal in a component sheet fails the static test by file and line | mutation M1 |

### P79-C (2026-09-12)

**Status: landed.** The presentational set is [`src/ui/components/`](../src/ui/components/): thirty components in seven family modules, a sheet each, plus `element.tsx` (the `render` escape hatch and the focus attribute) and `scale.ts` (prop values to token references). The focus ring is one rule in [`src/ui/styles/focus.css`](../src/ui/styles/focus.css). The layer scale gained a reader, [`uiLayer()`](../src/ui/styles/layers.ts), and with it the WordPress admin bar stops covering the Settings drawer header. The theme engine emits the type scale it had been carrying and never publishing. One unit suite, six Storybook stories, one e2e spec and three PHP tests cover the track; the FUTURE_TASKS entry is deleted.

**What a framework component does, in one rule.** It reads tokens and nothing else. Colour arrives as a `data-mullion-tone` attribute the sheet resolves to a token, so no component's TSX contains a colour. Per-instance geometry arrives as an inline custom property, so the value travels with the element into whatever tree it is portaled to. Sizes and variants are data attributes, so a rule never enumerates a combination. And the focus ring is one rule keyed on one attribute that every focusable stamps through a shared base, so it cannot miss a component built on it.

**What the measurement changed about the plan.**

| Plan said | Built |
|-----------|-------|
| "Build the presentational set listed in the study's section 4" | All thirty, in seven family modules with one sheet each rather than one file each. A `.mullion-stack` and a `.mullion-group` differ by two declarations and share the padding idiom; thirty files would have put one rule in each of seven of them. |
| Layout primitives take `gap`, `align`, `justify`, `wrap`, `padding` | Those five plus `paddingBlock` and `paddingInline`. Measured at the call sites: the axis form outnumbers the all-sides one (`py` 26 times on `Center`, 11 on `Text`, 7 on `Container`, against 6 `p` on `Stack`), so a single `padding` prop would have sent every one of them to `className`. |
| "renders as inline custom properties ... which travel with it into any tree" | As planned. A scale step resolves to the theme's token, a number to pixels, any other string passes through: the same reading Mantine gives `gap`, `p` and `radius` today, so Phase 81's codemod does not have to re-measure a call site to know what it meant. |
| "Mantine's full style-prop surface is deliberately not reproduced" | Held: `m`, `w`, `h`, `pos`, `c`, `fw`, `fz` and the responsive object form are all absent. `Text` is the exception the study allows for, and its props are the ones its 418 call sites actually spell. `c="dimmed"`, 233 of the 253 colour props on `Text`, becomes `tone="muted"`. |
| "One focus rule on `[data-focus-visible]`" | One rule, four selectors, every one keyed on `data-mullion-focus`, which `ControlBase` stamps. `[data-focus-visible]` is in the list so Phase 80's Base UI parts land under it unchanged. The attribute is the whole point: `chrome-portable.scss` spells the same ring as a list of Mantine class selectors and that list was found incomplete twice, at the Switch track and the SegmentedControl label. |
| "geometry values from the framework constants P78-C added" | As planned. The e2e reads `--mullion-color-primary-stroke` and `--mullion-color-focus-halo` off the ringed element and compares the paint to them, so the walk holds for any theme without a table of expected colours, which the P77-F walk needs. |
| Study 3.3 lists `font-size-*` under "Role tokens (exist)" | **They did not exist.** Every theme JSON has carried `typography.fontSizes` and `typography.headings` since the engine was written, and only the Mantine adapter could read them, so `Text size="sm"` had nothing to read. The engine now emits `--mullion-font-size-*`, `--mullion-heading-size-h1` to `h6`, the matching line heights and `--mullion-heading-font-family`. A theme that ships its own scale now moves every framework `Text` and `Title`. |
| "Storybook covers the set, with the decorator on `MullionProvider` rather than Mantine's" | A story opts in with `parameters: { mullion: true }` and renders under `MullionProvider` alone. Swapping the global decorator would have dropped Mantine's provider from the sixteen existing stories, which still render Mantine components, and put the framework's token sheet into the document the Storybook screenshot suite baselines. |
| Acceptance: the FUTURE_TASKS admin-bar entry "is deleted in the same change"; Follow-On Candidates: "Wiring the PHP side is a small follow-on" | The two halves of the plan disagreed. Resolved for the acceptance criterion, which is also what P78-C's own note asks for: the entry goes "once the drawer actually clears the bar, which is P79-C". Both sides landed here, the drawer reading `uiLayer('modal')` and the embed raising the offset, and the entry is deleted. |
| "The presentational set renders correctly in all four scopes" | Three of the four, measured in the browser: the gallery shadow root, a light-mount document and the overlay root. The wp-admin light DOM still has no provider, which P79-A recorded as a deliberate omission and P81-B closes. |
| The set replaces the names on the `@/ui` barrel | **Not yet, deliberately.** The components are exported from `@/ui/components` and the barrel's export list is unchanged. Moving `Text` there would move all 92 files that import it in one commit, which is Phase 81's job and its pixel-refresh budget; Phase 80's Decision B says the same thing for its own components. Storybook, the unit suite and the e2e fixture import the new path directly, so nothing in the shipped bundle carries a component nothing renders. |

**Design decisions taken while building.**

- *Colour is an attribute, never a prop value.* `tone="muted"` becomes `data-mullion-tone` and the sheet resolves it. The seven tones are the theme's semantic roles, so a theme redirects all of them at once, and `Badge color="blue"` (52 sites) stops naming a palette entry a theme cannot see. `ColorSwatch` is the single exception, because the colour it shows is the user's data rather than a theme decision; it rides inline and never reaches a sheet.
- *One unscoped selector, and it carries the namespace.* The tone ladder is the only rule not scoped by a `.mullion-*` class, because scoping it would mean a rule per tone per component. Under a light mount this sheet is adopted into the document, so a bare `[data-tone]` would paint host page content that happened to use the name; `data-mullion-tone` cannot.
- *The focus sheet registers last.* `Paper` and `Card` both set `box-shadow` for elevation, and inside one cascade layer a tie goes to the later rule, so a focusable card would otherwise lose its halo to its own shadow. The registration order is pinned by a test that says why.
- *`render`, not `as`.* Base UI, chosen in P78-B, spells polymorphism as a `render` prop taking an element or a function. Two spellings in one framework is worse than one, and the helper is twenty lines: class names and inline custom properties merge, every other prop on the supplied element wins, and React 19 carries the ref with the rest.
- *Breakpoints are constants in the sheet.* A media query cannot read a custom property, so a theme's `breakpoints` block could never have reached one. No bundled theme overrides it and the sheet carries those values. Each step falls back to the one below it, so `cols={{ base: 1, md: 2 }}` holds one column through `sm` without the call site spelling it.
- *`Collapse` animates `grid-template-rows` from `0fr` to `1fr`.* Nothing measures the content, so there is no ResizeObserver and nothing to get wrong when the content changes while open. It reads the duration token, so P79-B's reduced-motion switch already stops it.
- *The chip's input is clipped, not hidden.* `display: none` takes a control out of the tab order, which is the WCAG 2.4.7 failure P76-I-1 shipped. The input keeps its box and its native semantics, the label carries the visible state, and the ring is drawn on the label by the `sibling` value of the focus attribute, with the input's own outline suppressed.
- *`FileButton` holds its input in state and `CopyButton` owns its timer in an effect.* Both were written with refs and both tripped `react-hooks/refs`, correctly: each hands a closure over a ref to a render prop called during render. State makes `FileButton`'s dependency honest at the cost of one render on mount, and moving `CopyButton`'s countdown into an effect resets the window on a second copy and clears the timer on unmount, neither of which the ref version did.

**The finding that made the admin bar fix possible.**

`frameworkConstants` returned `layer-host-offset: '0'`, and `generateCssVariables` emitted every entry it returns, so the offset was declared on the gallery's own scope. Every step of the scale reads it as `calc(var(--mullion-layer-host-offset, 0) + N)`, so the design was that a host raises the offset and the layers move with it; but a declaration on the scope shadows any value set above it, for everything inside the scope. The token could not have done its job as shipped, in any host. The engine no longer declares it and the `var(..., 0)` fallback in each step carries the default. The e2e measures both halves inside the shadow root: with nothing set, the offset reads empty and `--mullion-layer-modal` resolves to `calc(0 + 500)`; with a `:root` declaration added at runtime, the same element resolves `calc(100000 + 500)`.

One consequence is worth writing down for whoever reads the scale next. Raising the offset raises every step, `layer-base` included, so a host that escapes its own furniture also lifts the gallery's lowest layer. That is safe today because the scale has exactly one reader after this change, the Settings drawer and the editor nested inside it, and it stops being safe the moment something inside the gallery reads `--mullion-layer-base` and is not inside a stacking context of its own.

**Two defects introduced and caught.**

1. *The showcase host carried `class="mullion-gallery"`.* `main.tsx` is still on the fixture page, finds every element with that class and mounts the real gallery into it, so the first full e2e run had two apps, two overlay roots and one contested shadow root, and all fourteen checks timed out waiting for the panel that never rendered. The class was never needed: a framework component reads tokens, not `global.scss`.
2. *Every component that takes padding dropped the props it does not own.* They read `padding` and its two axes out of `...rest` and then never forwarded what was left, so a `data-testid` or an `aria-label` on a layout primitive vanished; the three that did forward `rest` put `padding="md"` on the element as an attribute instead. Found while building the showcase, whose `data-testid` on a `Stack` did not appear in the DOM. The more useful half of the finding is that the unit suite passed before the fix and after it: it was asserting classes and custom properties and nothing at all about the props it was handed. `splitPadding` is now one function rather than a destructure repeated in nine components, and three tests pin it.

**Rendered output.** No shipped screen renders a framework component yet, because `@/ui` does not export them. Three things did change in the shipped tree. The engine emits eighteen more `--mullion-*` tokens on every scope and one fewer, all of them typography or the host offset, and nothing outside the framework reads any of them. The Settings drawer and its nested gallery-config editor take their z-index from `--mullion-layer-modal` and `--mullion-layer-popover` rather than from 450 and 500, which resolve to 500 and 600 unless a host raises the offset. And the embed emits one `<style>` element, once per page, only when `is_admin_bar_showing()`. `theme-qa`'s snapshot matrix and the axe checks are the check, see validation.

**The colour model, which the 2x visual pass turned into most of this track.**

The plan's validation line asks for "a visual pass at 2x on tight layouts, as P77-F did". It found two things at a glance, a `filled` button showing the browser's `buttonface` grey because no variant rule reset the background, and a page with no ground because the fixture never painted one. Then it raised a question a screenshot cannot answer: whether a `light` button's coloured label on a tint of its own colour is legible. Measuring that, across all 23 bundled themes, seven tones and six variants, is where this track spent most of its time, and it found three real things.

1. *`filled` paired the wrong two tokens.* It painted `--mullion-color-primary-stroke` as the ground with `--mullion-color-primary-on` as the ink. Those are not a pair: the engine contrast-selects `primaryStroke` against the surfaces at the 1.4.11 non-text floor (P75-E) and picks `primaryOnFill` against `primaryFill`, a different rung. Measured at 2.55:1 on tokyo-night, a 1.4.3 failure. The tone ladder now carries a fill and its ink separately from the colour a component draws with, and `filled` reads the pair.
2. *No role colour had a text rung.* A theme declares `success`, `warning`, `error` and `info` as raw colours and nothing had ever painted text in them, so nothing had ever selected a legible rung. Across the 23 themes, 268 role-and-ground pairs fall below 4.5:1 when the declared colour is used as text. The engine now derives `primary-text`, `success-text`, `warning-text`, `error-text`, `info-text` and `accent-text`: the nearest rung of the role's own ramp that clears 4.5:1 against `background`, `surface`, `surface2` and `surfaceRaised`, using the same `selectUiContrastIndex` walk P75-E wrote for `primaryStroke` with the floor raised. The hue moves by under five degrees on every theme, so a theme's red stays its red and becomes readable. `--mullion-color-primary-stroke` is untouched and remains the focus ring's colour at 3:1, which is what P77-F pinned.
3. *No hover mix of a filled control's ground is safe.* Three candidates were measured on all 23 themes and all seven tones: towards the ink at 90%, and towards the page ground at 85% and 92%. Every one dropped some pair under 4.5:1 (worst 3.48, 3.83 and 4.00, all on default-light), while the rest state cleared everywhere at worst 4.63. A ground the theme has been audited on is worth more than a ground that moves on hover, so `filled` keeps its ground and signals hover with the theme's elevation and a hairline of its own ink, neither of which touches the measured pair.

Out of that came the one rule the framework's colour API now states: **tint the ground or colour the ink, never both.** A `light` control tints and keeps the theme's text colour; `subtle`, `outline` and `Text` colour the ink and sit on neutral grounds the rung was selected against. An icon is the exception and keeps its tone on a tint, because an icon answers to 1.4.11's 3:1. The whole matrix is now a permanent check in `e2e/ui-showcase.spec.ts`: seven tones by six variants by 23 themes, rest and hover, buttons and text at 4.5:1 and icons at 3:1.

**A trap in measuring computed colour, which cost an hour and nearly cost a wrong design.** Chromium reports a `color-mix()` result as `color(srgb 0.94 0.87 0.87)` and everything else as `rgb(240, 222, 222)`. The first probe parsed both with one number-matching regex and read the floats as 0-255 channels, so every mixed ground measured as very nearly black. That produced a list of forty-odd failures that did not exist and pointed at a redesign of the wash that was not needed; the real failure list was four hover pairs in the 4.10 to 4.36 range, fixed by softening one percentage. The lesson is not about `color-mix`: it is that a probe reading `getComputedStyle` in this codebase now meets at least two colour serialisations, and the check in `ui-showcase.spec.ts` carries the normalisation with a comment saying why. What survived the correction is recorded above; what the bad measurement had suggested about the `light` variant did not, and was rechecked from scratch.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically afterwards.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| no colour literal (static) | `color: #ff0000` added to `components/control.css` | fails naming the file and line |
| no `!important` (static) | `!important` added to a `components/layout.css` declaration | fails naming the file and line |
| no ancestor scheme selector (static, both guards) | `[data-mullion-color-scheme="dark"] .mullion-kbd` in `components/typography.css` | the sheet guard and the P79-A source guard both fail, each naming the line |
| the ring registers last | `ui/focus` moved ahead of the component sheets | the registration-order test fails, quoting the rule it protects |
| every control stamps the focus attribute | `focusable` dropped from `ControlBase` | two unit tests fail, including the one for the `render` escape hatch |
| colour is an attribute, never a value | `Text` paints `tone="muted"` as an inline `color` instead | the typography test fails on the missing attribute |
| a component forwards what it does not own | `Stack` stops spreading its pass-through props | the forwarding test fails on the caller's `data-testid` |
| the host offset is read, never declared | `frameworkConstants` returns `layer-host-offset: '0'` again | the engine test fails on the property and on the emitted declaration |
| the type scale is the theme's | the `font-size-*` emission removed from `generateCssVariables` | three engine tests fail, the missing-typography fallback among them |
| responsive columns per breakpoint | `--mullion-cols-md` dropped from `SimpleGrid` | the layout test fails |
| the chip rings its label, not its clipped input | the two `sibling` selectors removed from `focus.css` | the chip e2e check fails: the clipped input paints a 2px ring of its own |
| the embed raises the host offset | `host_layer_style()` returns the empty string | two of the three PHP tests fail; the third, which asserts the offset is absent without an admin bar, still passes, which is what makes it worth having |
| a tone paints a legible text rung | the danger tone points at `--mullion-color-error` again | the contrast matrix fails, naming the theme, the variant and the ratio |
| `filled` pairs the fill rung with its own ink | `filled` painted with the draw rung and the primary ink, as the first draft did | the contrast matrix fails across themes and tones, buttons at 4.5:1 and icons at 3:1 |

**Acceptance criteria, checked.**

| Criterion | Where it is proved |
|-----------|--------------------|
| The presentational set renders correctly in all four scopes | `e2e/ui-showcase.spec.ts`: the component sheet carries its layer statement and its rules into the gallery tree and the overlay root under both mounts, and a component's painted colour, type size and gap equal the theme's tokens in the inline scope and the overlay scope alike. The fourth scope, the wp-admin light DOM, has no provider; P79-A recorded that omission and P81-B closes it |
| The P77-F ring walk passes against framework components, all four mount and chrome combinations, asserting core colour, 2px width, the halo token present and the exact 6px halo | the "focus ring on framework components" block, four walks plus a fifth on a second theme. It compares the paint to the tokens read off the ringed element rather than to a table of expected colours, so it holds for any theme, and it pins the 2px offset as well as the 2px core; mutations M5 and M11 |
| Every component sheet passes the three static tests from P79-B | `src/ui/__tests__/componentSheets.test.ts`, with the scan's own reach now pinned so a guard that scans nothing cannot pass; mutations M1 to M3 |
| Storybook covers the set, with the decorator on `MullionProvider` rather than Mantine's | `src/ui/components/framework.stories.tsx`, six stories under `Framework/Presentational set` with a theme picker in the toolbar; `.storybook/preview.tsx` chooses the provider per story so the sixteen existing Mantine stories are untouched |
| The drawer header clears the WordPress admin bar via the host-safe layer token, and the FUTURE_TASKS entry is deleted in the same change | the drawer and its nested editor read `uiLayer('modal')` and `uiLayer('popover')`; `Mullion_Embed::host_layer_style()` raises the offset when the admin bar shows, three PHP tests; the e2e proves a host declaration above the gallery reaches the scale inside the shadow root; the entry is removed from `docs/FUTURE_TASKS.md` and the removal is logged there; mutations M8 and M12 |
| Validation: `npx vitest run`, the ring walk in `e2e/theme-qa.spec.ts`, and a visual pass at 2x on tight layouts | below. The ring walk for framework components is a new block in `ui-showcase.spec.ts` rather than an extension of `theme-qa.spec.ts`, because `theme-qa` tabs the real Settings drawer and no framework component renders there until Phase 81; `theme-qa`'s own walk is unchanged and still guards the Mantine tree |

**Validation.** Run at CI parity on the final tree: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run ui:allowlist:check` green at 178 files (nothing this track added names a Mantine package), `npm run test:coverage` 4,118 of 4,118 across 268 files with every threshold met (statements 86.52, branches 75.34, functions 83.10, lines 88.50), `npx playwright test` 67 of 67 with no snapshot differences, `npm run build-storybook` clean, and `npm run build` clean apart from the pre-existing chunk-size warnings. The suite grew by 53 unit tests (46 in the new component suite, four in the engine's component-token suite and three in its CSS-variable suite) and by 16 e2e tests, all in the new `ui-showcase` spec. One run of the coverage suite failed a single unrelated `AuthContext` `waitFor` under load and passed on its own and on every rerun; nothing in this track touches `src/contexts`.

The visual pass was three 2x captures at 390px and 1280px, on `default-dark`, `github-light` and `tokyo-night`, with a control focused so the ring is in frame. It is what found the `buttonface` grey and started the contrast work above; the captures after the fixes show the ground, the transparent outline variant and the two-tone ring resolving per theme.

### P79-D (2026-09-12)

**Status: landed.** Theme management is framework state. `MullionProvider` owns the registry, the catalogue, the initial-theme priority, switching, preview and persistence; [`src/contexts/ThemeContext.tsx`](../src/contexts/ThemeContext.tsx) is what remains of the app-side owner. It went from 224 lines to 64, of which 23 are the component, and all it does now is turn the framework's current theme into the two Mantine-shaped values the app still reads. `useTheme()` kept its exact shape, so none of its thirteen consumers changed when the owner did. The theme catalogue moved into the engine beside the definitions it describes, and the WordPress copy is generated from it.

**What moved, and what deliberately did not.** The merge the phase is named for is a move of *ownership*, not a move of files. Selection, persistence, scoping and the catalogue now have exactly one implementation and it is the framework's. `ThemeContext`, `chromeTheme.ts` and `AdminChromeProvider` all survive this track because what is left in them is Mantine variable plumbing (`defaultCssVariablesResolver`, `mergeMantineTheme`, a nested `MantineProvider`, `data-mantine-color-scheme`), which has nothing to do with theme management and dies with Mantine in Phase 81. The Follow-On row promising their deletion in Phase 81 and this track's "move them into the framework" are both satisfied by that reading, and only by it.

**What the measurement changed about the plan.**

| Plan said | Built |
|-----------|-------|
| "Move them into the framework as provider surface" | Ownership moved; four files stayed. `ThemeContext` is now an adapter over `useMullionTheme()`, holding only `mantineTheme` and `cssVars`. Deleting it here would have contradicted the phase's own Follow-On row, which keeps it until Mantine goes. |
| "`ThemeSelector` becomes a framework component reading the registry" | The registry reading moved; the file did not. `ThemeSelector` renders a Mantine `Select`, and Phase 80 owns the real one. Moving the file into `src/ui/` would have put a `@mantine/core` import inside the framework, which is the one thing the P78-A boundary exists to prevent, and would have *added* a path to an allow-list that is only allowed to shrink. What the criterion actually asks for is done: the selector reads `useMullionTheme()`, `groupThemes()` and `themeSwatches()`, and no longer imports a registry at all. |
| "`resolveWpThemeIds` is the WordPress glue P79-D is meant to move" | Moved as a seam, not as code. `MullionProvider` gained a `themeCandidates` prop and the app passes `resolveWpThemeIds` into it. Moving the reads themselves would have put `window.__MULLION_CONFIG__` inside a framework whose whole purpose is to be host-free; the framework's runtime code imports nothing but React, the engine and one debug helper, and this track kept it that way. |
| "the four-step initial-theme priority" | Found missing. `MullionProvider` resolved storage, then `theme`, then the brand theme: it had no host-candidate step at all, so a WordPress-injected theme would have been ignored the moment the framework became the owner. The step is now there and each of the four is pinned by its own test. |
| "the catalogue grouping the WordPress settings field shares" | The catalogue moved into `packages/theme-engine/src/definitions/_catalog.json`, beside the definitions it describes. The framework registry reads it through the engine; `wp-plugin/mullion-gallery/theme-catalog.json` is now generated from it by `npm run themes:catalog`, and `themes:catalog:check` fails the build if the two drift. PHP reads its own file at the same path as before and needed no change. |
| "covered by the existing tests moved with it"; "proved by the existing `ThemeContext` suite" | **Both claims were false.** The suite had eleven tests and not one of them covered the priority *order* or the per-instance storage key, which are the two things the criteria name. It asserted that a stored theme is restored and that a WordPress global is read, never that one outranks the other. Nineteen tests now pin the behaviour where it lives. |
| `forcedThemeId` is part of the behaviour the plugin depends on | It is not. No production file has ever passed it, in this track or any before it: every use of it is a test pinning a theme. It is not ported. Pinning a theme for a test is now a `themeId` option on the shared `render`, which sets it at the root where the manager is. |

**Findings.**

1. *The storage key and the scope id are different ids, and conflating them silently discards every saved theme choice.* `ThemeProvider` scoped its key by `spaceId` (`mullion-theme-id-42`); `MullionProvider` scopes its generated CSS selector by `rootId`, the per-React-root key. P79-A's `storageKeyFor(key, instanceId)` had one id to work with because nothing had yet asked it to have two. I saw the collision, added a separate `persistence.scope`, and then defaulted it to `instanceId` when it was not given, which reintroduced the same bug for the case that matters most: a page with no space passes no scope, so the key became `mullion-theme-id-<rootId>` and the unscoped value written by every previous release read back empty. The unit suite did not catch it, because I had written a test asserting that fallback was correct. `theme-qa` caught it in the browser: three behavioural failures and three visual snapshots 93% different, because the gallery painted the brand theme instead of the stored one. The scope is now explicit and never defaulted, and the two tests that encoded the wrong assumption (mine, and P79-A's own `scopes the storage key per instance`) now pin the right one. This is a deliberate change to an API P79-A shipped three commits ago: `instanceId` scopes the generated scope id and nothing else.

2. *An uninstalled instance default used to fall through to the host hint, and in the first draft it stopped doing so.* `ThemeContext` guarded step 2 with `hasTheme(defaultThemeId)`, so a space configured with a theme that is no longer registered fell through to the WordPress-injected candidate. Writing the priority as a chain of `??` lost that: an unregistered id is still a string, so it short-circuited the chain and landed on the brand theme, skipping the host's answer entirely. Each step is now checked before it counts, and a test names the case.
3. *The two registries described themes from different copies of the same file.* The app registry read `wp-plugin/mullion-gallery/theme-catalog.json` directly. With the framework registry also needing groups and descriptions, that would have been a second reader of a file inside the WordPress plugin, from a directory that is meant to be extractable. Both now read the engine's copy, and the adapter suite asserts the two produce identical metadata in identical order, which is the cheapest possible proof that the catalogue merge did not change what a user sees.
4. *`getAllThemeMetaGrouped()` became dead the moment the framework could group.* Removed rather than left, so the catalogue grouping has one implementation and not two that can disagree.

**Measurements.** Framework registry initialisation for the 23 bundled themes: **24ms** on the production path and **85ms** with the development-only contrast audits included, both against the criterion's 100ms budget. A lookup is a `Map.get` at **0.029 microseconds**, unchanged. A timing assertion would be flaky, so what the suite pins instead is the property that would actually break if a getter started recomputing: `getThemeEntry(id)` returns the same object every time, and the same object `listThemes()` holds.

**Acceptance check.**

| Criterion | Evidence |
|-----------|----------|
| The initial-theme priority order is unchanged | Seven tests in `src/ui/__tests__/themeSelection.test.tsx`: each of the four steps in isolation, each adjacent pair in the order the plan names, and the two fall-through cases (an unregistered stored choice, an uninstalled instance default); mutations M1 and M2 |
| Persistence, the admin disable flag and the per-instance key behave identically | Seven tests: persist, restore, the admin lock switching without storing, storage ignored when not asked for, and three on the scoped key including two independent instances; the multi-instance "only the first gallery persists" rule is carried on `ThemedApp`; mutations M3 and M7 |
| `getTheme` stays an O(1) map lookup; registry init stays under 100ms for 23 themes | 0.029 microseconds per lookup and 24ms of initialisation, measured above; identity pinned by test rather than by timing |
| No app file imports a theme registry directly | ✔ for theme identity, the catalogue and switching: zero. Four files still import `src/themes/index.ts` for the `MantineThemeOverride` (`ThemeContext`, `useTheme`'s outside-provider fallback, `AdminChromeProvider`, `src/theme.ts`). That is the Mantine adapter reading its own adapter output, and Phase 81 deletes the file and all four readers together |
| The existing theme suites, re-pointed and unchanged in their assertions | The chrome, selector, builder-colour and adapter suites all kept their assertions; only their wrappers changed. The selection assertions moved to the framework suite and were extended, because the criteria claimed a coverage that did not exist |
| `theme-qa` end to end, both mount modes | `e2e/theme-qa.spec.ts` 25 of 25 against the inverted provider tree, including the six per-theme snapshot pairs and the four focus-ring walks, with no snapshot movement. This suite is what caught finding 1 |

**Mutation testing.** Each applied alone, then reverted byte-identically.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| M1 the host-candidate step exists | `candidateId` dropped from the priority chain | three selection tests fail, naming the candidate they expected |
| M2 each step must name a registered theme | the `hasTheme` check removed from the instance default | the fall-through test fails: the brand theme, not the host hint |
| M3 the storage key is scoped by the space | `storageKeyFor` pointed back at `instanceId` | all three key tests fail, including the one written after the e2e caught this exact mutation in live code |
| M4 the catalogue orders the list | `listThemes()` returned to registration order | the catalogue-order test and the adapter's equality test both fail |
| M5 the catalogue describes a theme | the catalogue lookup dropped from `buildEntry` | the description test fails, and so does the adapter's `getAllThemeMeta` equality |
| M6 the WordPress copy tracks the engine | one group renamed in the generated copy | `themes:catalog:check` fails naming both files |
| M7 the admin lock blocks writes, not switches | `setTheme` persists regardless of `persisted` | the admin-lock test fails on the stored value |
| M8 the adapter publishes a stable context value | `useMemo` dropped from the Mantine override lookup | **survived the first guard**, which asserted the override's identity: that object comes from the registry map and is stable however the adapter is written. Re-pinned on the context value itself, which is what a Mantine consumer actually re-renders on, and the mutation then fails |

## Outcome

All four tracks landed 2026-09-12. The framework has a provider that owns scope, tokens, portal container, lock and follow, and now theme management as well; one style-delivery mechanism that reaches every tree the plugin paints; thirty presentational components that read tokens and nothing else, under a single focus rule; and a colour model with a text rung and a fill ink for every semantic role.

What the phase set out to prove, from Rationale 5: a component can read one token and be correct in the gallery tree, in the overlay root, under a locked brand palette and under a followed gallery theme, with nothing carried inline. Three of the four scopes are proved in a browser. The fourth, the wp-admin light DOM, still has no provider; P79-A recorded that as a deliberate omission and P81-B closes it.

Of the five workarounds named in Rationale 2, `ThemeContext`'s variable injection is gone (P79-A) and its registry, persistence and scoping are gone (P79-D), leaving 64 lines of Mantine adapter where there were 224. `OverlayRootSync`, `AdminChromeProvider`, `adminChromeStyles()` and the `--mullion-builder-*` bridge are all still standing, and all four are now Mantine plumbing with a named replacement rather than theme management. They go when Mantine goes, in Phase 81.

Phase 80 builds the components that handle a keypress. Phase 81 moves the 92 files that import `Text` and the rest onto the framework, and deletes what this phase left behind.
