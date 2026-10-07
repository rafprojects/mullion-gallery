# Phase 81 - Consumer migration and Mantine removal

**Status:** Planned, no code yet
**Created:** 2026-09-10
**Last updated:** 2026-10-02 (P80-F settled the manager hosts and the tooltip rule, and placed the 22 tooltips that break it into B; earlier the same day Phase 80's follow-ons were placed into B and D, including `useBroadcastStaleness` and the notification and confirm migration; the Settings panel clipping defect added to B on 2026-09-14)

### Tracks

| Track | Description | Status | Effort |
|-------|-------------|--------|--------|
| P81-A | Style props and the size and variant scales: the mechanical bulk of the migration | Planned | Large |
| P81-B | Migrate the consumers, theming-critical surfaces first | Planned | Large |
| P81-C | Test, story and e2e harness migration | Planned | Medium |
| P81-D | Remove Mantine and delete the workarounds it required | Planned | Small-Medium |

---

## Rationale

1. **What this phase is.** The framework exists after Phase 80 and nothing uses it. This phase moves 142 files onto it, then deletes what it replaced. It is the largest phase by file count and the least interesting by design content, which is exactly why it is separated: mixing it into Phase 80 would have put "does this component work" and "did this screen change" in the same diff.

2. **Why the style props are their own track.** They are the single largest mechanical cost of leaving Mantine, and they are independent of which components exist.

   | Surface | Count |
   |---------|-------|
   | Mantine style props (`gap`, `c`, `fw`, `mb`, `py`) | 1,535 |
   | Literal `size`, `variant`, `radius`, `color` props | about 1,500 |
   | Files importing `@mantine/core` | 142 of 357 non-test |
   | Test files rendering through the Mantine provider wrapper | 117 |
   | Storybook stories with the Mantine decorator | 16 |
   | e2e specs using Mantine class selectors | 3 |

   This cost is identical under any replacement, including Mantine's own headless mode, which is why the evaluation treated headless Mantine as a fallback rather than a cheaper route.

3. **Why removal is a track and not a side effect.** `adapter.ts`, `chromeTheme.ts`, `chrome-portable.scss`, `AdminChromeProvider`, `adminChromeStyles()` and the `--mullion-builder-*` bridge are load-bearing until the last consumer moves. Deleting them is a deliberate step with its own verification, and several of the P77-A guards are written against a world where they exist and must be retargeted rather than deleted.

4. **The release gate.** The user decided on 2026-09-10 that release does not wait for full removal: it waits for the framework, the behavioural components and the theming-critical surfaces, with the long tail migrating behind the facade afterwards. P81-A, P81-B's first wave and P81-C are therefore pre-release; P81-B's tail and P81-D may land after. That is what the facade's ESLint boundary exists to make safe.

5. **Success.** `@mantine/*` appears in no `package.json`, or appears with a written reason and a shrinking allow-list. The theme adapter is gone. No screen changed except where the designer intended it to.

## Key Decisions

| # | Decision | Resolution |
|---|----------|------------|
| A | Does the release wait for full removal? | **No.** User decision, 2026-09-10: ship when the visible surfaces are migrated; the long tail follows behind the facade. Recorded because it is the decision that lets Phase 82 start before this phase ends. |
| B | Pixel parity or refresh? | **Refresh, with the designer.** User decision, 2026-09-10. `theme-qa` baselines are recaptured per surface as the refresh lands, so a moved pixel is evidence to review rather than an automatic failure. This is the one phase where the Phase 78 rule "a refactor moves zero pixels" does not apply, and saying so explicitly is what keeps that rule meaningful everywhere else. |
| C | Codemod or by hand? | **Codemod for the mechanical props, by hand for the rest.** `gap`, `align`, `justify`, `wrap`, `p` and the spacing props map directly and are worth automating across 1,535 occurrences. Colour and typography props (`c`, `fw`, `fz`) become `Text` variants or classes and need judgement. |
| D | What happens to the 3 e2e specs using Mantine class selectors? | **Retargeted to our own stable attributes**, not to the framework's internal class names. An e2e selector that depends on a library's generated class is the same fragility in a new costume. |
| E | Does `@mantine/hooks` go too? | **Yes, by default.** Seven hooks in 12 files, about 150 lines to own, and keeping one styling-free Mantine package for that is not worth the dependency. Reversible if the migration finds a hook that is harder than it looks. |

## Execution Priority

0. **Phase 80's P80-D, P80-E and P80-F land first.** P80-F settles two things that change what this phase migrates onto (whether `notify` and `confirm` are one store per page, and whether the overlays stay in the overlay root), and P80-D's keyboard suite is the regression net for every surface batch below.
1. **P81-A** first. It is mechanical, it touches almost every file, and doing it before the component swap means each file is touched once for props and once for imports rather than churned twice in one diff.
2. **P81-B** next, theming-critical surfaces first: the Settings panel, the Layout Builder chrome and the admin panel, because those are where Phase 76's defects lived and where a regression is most likely.
3. **P81-C** alongside B, per batch. A migrated component with an unmigrated test harness is untested.
4. **P81-D** last, and only when the allow-list is empty or its residue is documented.

---

## Track P81-A - Style props and the size and variant scales

### Problem

1,535 Mantine style props and about 1,500 literal `size`, `variant`, `radius` and `color` props are spread across the component tree. The framework deliberately does not reproduce Mantine's full style-prop surface, so these cannot be carried over unchanged.

### Fix

A codemod for the direct mappings onto the framework's layout primitive props, which render as inline custom properties. Colour and typography props become `Text` variants or classes. The `size` and `variant` scales are the designer's to set, and the mapping from Mantine's scale to ours is written down once and applied uniformly rather than decided per file.

**Data point from P79-B (2026-09-12).** Responsive style props were partly inert until P79-B. React 19 inserts Mantine's hoisted `__mdi__` sheet as a root's first child, so a responsive prop setting the same property as the component's core rule (`Card` with `p={{ base: 'sm', md: 'md' }}`, four sites in `AccessTab`) lost to the core rule at the base breakpoint while Mantine's sheet was a `<style>` after it. P79-B registers Mantine's sheet in the `mullion.vendor` cascade layer, so the hoisted rule now wins and those cards take `sm` padding below `md`. The codemod should carry the responsive intent (the values as written), not what painted before P79-B.

**Data point from P79-0 (2026-09-13).** The framework `Container` scale is `40rem` to `90rem` (`xs` to `xl`) where Mantine's is 540px to 1320px, so the names do not map one to one: the single `size="sm"` call site moves from 720px to 768px. The mapping document should list the container scale beside the spacing scale rather than carry the step names across unchanged. `Text` and `Title` carry no colour of their own and inherit, as Mantine's do, so `c="dimmed"` becomes `tone="muted"` and an unqualified `Text` needs nothing.

### Acceptance criteria

- No file outside `src/ui/` uses a Mantine style prop.
- The scale mapping is a document plus a codemod, not 3,000 individual judgements.
- Every batch passes the full suites, with `theme-qa` diffs reviewed rather than auto-accepted.

### Validation

- `npx vitest run`, `npx playwright test`, `theme-qa` with a reviewed diff per batch.
- The P77-C lesson applies: `theme-qa` tolerates a 0.1 pixel-diff ratio, so a batch must be reviewed with an explicit pixel diff rather than trusted to a green run.

---

## Track P81-B - Migrate the consumers

### Problem

142 non-test files import `@mantine/core` across 75 symbols. Counting the other four restricted packages and the test and mock files, the P78-A allow-list starts at 178 entries, 24 of which are test files and seven of those coupled only through a `vi.mock` call that no import scan sees. The facade means they can move in any order, and the order should be risk-first.

Six of those entries are in `packages/shared-ui`, and they are not an ordering problem. Its isolated `tsconfig.build.json` overrides `paths` to resolve only `@mullion/shared-utils`, so it cannot import `@/ui` at all: those six files cannot be migrated in place by any amount of work. **Phase 78 Decision J settled this on 2026-09-11: the package is dissolved rather than kept.** It resolves to source in `vite.config.ts` and `tsconfig.json`, no workflow ever builds or publishes it, and four of its six components already keep their tests in `src/`, so the boundary had no consumer and no build while costing the blocker.

### Fix

**Batch zero: dissolve `packages/shared-ui`.** Move `LoginForm`, `Lightbox`, `KeyboardHintOverlay`, `SpaceSwitcher`, `AuthBarFloating` and `AuthBarMinimal` into `src/components/` beside the tests that already live there (`Auth/`, `Galleries/Shared/`), move `RootIdContext` and `CanvasTransformContext` into `shared-utils`, and delete the package with its build config and `prepack` chain. This clears no allow-list entries by itself, since the six files still import Mantine at their new paths, but it is the prerequisite that makes them migratable at all. Per Decision J, `LoginForm`, `SpaceSwitcher` and the `AuthBar` variants land in `src/components/` and not in `@/ui`.

Then batch by surface, not by component. Settings panel, Layout Builder chrome, admin panel, then the gallery and viewer surfaces, then the wp-admin Spaces and Assets apps. Each batch shrinks the ESLint allow-list, which the P78-A test requires to be monotonic.

The Settings batch carries one piece of design work with it: the **Typography panel redesign**, filed in [FUTURE_TASKS.md](FUTURE_TASKS.md) under Design & Brand from a user report on 2026-09-11. Its four problems all live in files this batch rewrites anyway (`TypographyEditor.tsx`, `CssValueInput.tsx`, `UnitScrubField.tsx`), and Decision B already permits the pixels to move here, so porting them forward and fixing them afterwards would be doing the same file twice. It depends on P80-A shipping a number field with a unit slot.

**The Settings batch also carries a live clipping defect, reported by the user on 2026-09-14.** The Settings panel is cut off on its right-hand side by roughly 20px, obscuring the right edge of the fields, the column headings and the panel's own edge. Not yet diagnosed: a static read rules out `adminChromeStyles`, which contributes only custom properties and no width, so the cause is in the drawer's own box rather than in the shared chrome helper. The two candidates worth measuring first are the `body: { overflow: 'hidden' }` style in `SettingsPanel.tsx`, which clips anything wider than the drawer content rather than scrolling it, and the scroll `Box` inside it, whose `overflowY: 'auto'` makes `overflow-x` compute to `auto` as well and whose scrollbar eats inner width that fixed-width children do not give back. Diagnose it in a browser by comparing the content box, the inner box and the viewport; do not fix it from a source read. **A lead, from P80-G's pixel review on 2026-10-07:** every `theme-qa` snapshot of the open Settings drawer had drifted about 41,000 pixels from its 2026-09-09 baseline, and the diff is the whole drawer content shifted sideways by a few pixels. The 10% tolerance hid it; P80-F's `main.tsx` change was ruled out by rendering without it. The baselines were regenerated in P80-G, so the shift is now the baseline, and the drift came in somewhere between P77-C and P80. It is filed here rather than as a Phase 80 track because the panel is a consumer surface and Key Decision B forbids Phase 80 touching one, and because this batch rewrites these exact files anyway.

**The select family carries a live accessibility defect that this track fixes, and it is the reason the Settings batch cannot slip quietly.** Confirmed 2026-09-14: `use-combobox` resolves `const root = getRootElement(targetRef.current)` from the **trigger** and finds the active option with `findElementBySelector('#listId [data-combobox-active]', root)`. The shipped portal default puts the dropdown in the overlay root, a *different* shadow root, so the lookup returns null and arrow keys do nothing. `Select`, `Autocomplete`, `MultiSelect`, `TagsInput` and `TreeSelect` are all keyboard-inoperable today, across 26 files, which is a WCAG 2.1.1 failure on every dropdown in the product. Proved by `?portal=shadow`, which restores it; `?portal=document` does not, because `document.querySelector` does not pierce the overlay root either. The user chose on 2026-09-14 to fix it here rather than re-plumb Mantine portals this phase deletes.

**The binding constraint that follows: a listbox must live in its trigger's root.** Base UI uses ID-referenced ARIA the same way Mantine does, so migrating onto the framework's own `Select` does **not** fix this by itself — it reproduces it unless the popup stays in the trigger's tree. Verify the keyboard contract on a shadow-mounted gallery before the batch is called done, not after.

**The notification and confirmation call sites (filed 2026-10-02).** 42 `notifications.show` calls in 16 files become `notify.show`, and 6 `modals.openConfirmModal` sites become `confirm`, by renaming the callee (Phase 80 Key Decision E). Three things ride along:

- **`useBroadcastStaleness` stops dismissing its own warning.** It passes `autoClose: 0`, which Mantine reads as a zero-length timer, so the "Template updated in another tab" warning, whose message tells the user to close and reopen the tab, disappears on the next tick. `notify` reads `0` as "keep it up", so the rename fixes it. The user chose on 2026-10-02 to let this phase fix it rather than patch Mantine first; it is named here so the fix is verified rather than assumed.
- **`ContextualToolbar` stops using `modals.open` and `modals.closeAll`.** It raises a rename form imperatively, which `confirm()` does not cover and should not. Render it as a `<Modal>` with local state.
- **The hosts: settled by P80-F on 2026-10-02.** Both framework hosts are page singletons: mount `<Notifications label={t(...)}>` and `<Confirmations />` in each gallery's tree if that is convenient, and only the first mounted renders, with the next taking over if it unmounts. P80-F also fixed today's Mantine hosts, which rendered every toast and opened every confirm once per gallery (confirming both ran the action twice, reproduced on a two-gallery page): `main.tsx` now renders them beside the app, in the first gallery only, behind `usePageHost('mantine-managers')`. When the sites move, replace those two lines with the framework hosts and delete that call. `e2e/ui-managers.spec.ts` asserts the two-gallery case for the framework hosts.

**What each batch carries from Phase 80 (filed 2026-10-02).** Phase 80 found these while building the components; each lives on a surface a batch below rewrites anyway, so each is fixed in that batch rather than patched first and migrated second.

| Batch | Item | Source |
|-------|------|--------|
| Settings | The panel is clipped about 20px on the right (above). | User report, 2026-09-14 |
| Settings | `Show Title` and `Show Subtitle` in the Typography panel lose the focus ring's left edge. Same class as the menu row: a 6px outset ring inside a container that clips. Fix with the redesign the batch already carries. | P80 follow-on; held for this phase by user decision 2026-09-14 |
| Layout Builder | `useLayoutBuilderKeyboardHandlers` handles ArrowUp and ArrowDown on `document` with no guard for an event from an `input`, `textarea` or `contenteditable`, so typing in any builder field moves the selected slots. | P80 follow-on |
| Admin Panel | Three filled controls sit flush with their container, which standing rule 8 calls a layout defect: `Add Media` and `Rescan Types` (0px clearance) and the Media sort mode (3px). Give each 6px of clearance for the outset ring. | Designer, live Admin Panel, 2026-09-14 |
| Gallery | Forward Tab moves backwards on screen: Typography icon, then Access Mode to its left, then the campaign filters further left. A WCAG 2.4.3 focus-order failure; fix the DOM order on the migrated surface rather than patching it twice. | P80-A manual pass, 2026-09-14 |
| Any | `link-in-text-block`: P79-0's tone probe measures an `Anchor` inside muted `Text` at 1.11:1 against its surroundings with no underline. It may be fixture-only. Confirm on the first real surface that composes the two, and if it reproduces, fix it on `Anchor` rather than in the theme. | P79-0 |
| wp-admin Spaces | `SpaceManagementView` selects a space with a bare `<tr onClick>`: no role, no tab stop, no key handling, so the primary control of the screen cannot be reached from the keyboard. Make it a real control with the ring. The rest of that screen's UX pass (master and detail, restoring archived spaces) stays in FUTURE_TASKS. | FUTURE_TASKS, Spaces UX pass item 3 |
| Every batch | Two Phase 80 contracts differ from Mantine on purpose and must not be read as regressions: tabs activate manually (arrow moves focus, Enter selects; `activateOnFocus` restores the old behaviour per bar), and the accordion has no arrow-key navigation. Both are asserted by tests. | P80-B |
| Every batch with a tooltip | **A tooltip is visual only** (P80-F item 10): the framework `Tooltip` gives assistive technology nothing, so no tooltip may carry information the control's own name or visible text does not. Of the 115 production tooltips, 90 already satisfy that. The classification put the other 25 in buckets that carry more; three of those are already conveyed by an `aria-label` (`LayoutBuilderCanvasPanel.tsx:719` and `:797`, `useCampaignsRows.tsx:93`), and the remaining 22 each need their own channel as their batch migrates, listed in the row below with two kinds of tooltip-only text found inside the 90. | P80-F, 2026-10-02 |
| (the 22) | **No name at all:** `MediaTab.tsx:276-278`, the three view-mode segments, whose only content is an icon; give each segment an `aria-label`. **Explanation only in the tooltip, on a focusable control:** `SlotPropertiesPanel.tsx:135` and `MaskPropertiesPanel.tsx:49` (info buttons) and `DesignAssetsGrid.tsx:156` (the current tag list); make the first two a `Popover` and put the tags in the label. **Reason only in the tooltip, on a disabled control:** `AdminPanel.tsx:291` and `:297` ("Pick a space first"); show the reason as text, because a disabled button takes neither focus nor hover. **Extra detail on a visible-text control:** `CampaignsMobileList.tsx:167`, `useCampaignsRows.tsx:218` and `:249`, `LayoutBuilderCanvasPanel.tsx:666`, `MediaTab.tsx:345`; fold it into the name or the description. **On a non-focusable element:** `CampaignsMobileList.tsx:97` and `:120`, `QuickAddUserModal.tsx:78`, `SpaceManagementView.tsx:456`, `useAccessRows.tsx:109`, `:129` and `:144`, `useCampaignsRows.tsx:171` and `:175` (a bare count in a badge); mouse-only today, so the text moves into the element. **Shortcut hints** in the Layout Builder toolbar and `AdminPanel.tsx:308`: add `aria-keyshortcuts`. **Transient feedback** in `WebhookSettingsSection.tsx:79` ("Copied!"): announce it with `notify` or a live region. Line numbers are from the classification of 2026-10-02 and will drift. | P80-F, 2026-10-02 |
| Every surface on a raised ground | Migrate onto the ladder Phase 80's P80-G corrects. `COLOR-SPEC.md` rule 13: on dark themes a raised element reads by lightness and needs no border; on light themes it carries a 1px `borderStrong` hairline and its shadow. Components that grew a border to stand in for a missing rung lose it on dark themes. | Designer, 2026-10-02 |

### Acceptance criteria

- **Every migrated dropdown is operable by keyboard on a shadow mount**, verified in a browser rather than jsdom: arrow keys move the highlight, Enter selects, and a screen reader announces the active option.
- **The Settings panel is not clipped on any axis**, measured in a browser at more than one viewport width rather than eyeballed, since the reported symptom is the panel's own right edge being cut off.
- **`useBroadcastStaleness`'s stale-tab warning stays on screen until dismissed**, checked in a browser after the notification sites move.
- No call site uses `modals.open`, `modals.closeAll` or `modals.openConfirmModal`.
- **On a page with two galleries, one `notify.show` renders one toast and one `confirm()` opens one dialog**, checked in a browser on the product rather than only on the showcase.
- **No tooltip carries information its control does not**: each of the 22 sites in the carried table has its own channel.
- Every row of the "carried from Phase 80" table is closed, or re-filed with its reason.
- The allow-list shrinks with every batch and never grows.
- `packages/shared-ui` is gone, its eight modules rehomed, and the allow-list paths updated to match before the first surface batch.
- Per batch: full suites green, axe gate green, and a keyboard pass on any surface whose interaction changed.
- The wp-admin apps work with WordPress styles present and without a global reset, which is the P77-E criterion C10.

### Validation

- Full suites per batch, plus the manual wp-admin pass from P77-B's validation for any batch touching admin surfaces.

---

## Track P81-C - Test, story and e2e harness migration

### Problem

117 test files render through a wrapper that mounts `MantineProvider` and `ModalsProvider`, 16 stories use the Mantine decorator, and 3 e2e specs select on Mantine class names. None of these is production code, and all of them block removal.

### Fix

Re-point `src/test/test-utils.tsx` at `MullionProvider`, keeping the global `CloseButton` accessible-name default the axe tests mirror. Re-point the Storybook decorator. Retarget the e2e selectors at our own stable attributes.

### Acceptance criteria

- No test utility, story or spec imports `@mantine/*`.
- The axe gate covers the same surfaces as before, at minimum.
- The structural a11y gate's existing coverage does not shrink.

### Validation

- `npx vitest run`, `npx playwright test`, `npm run build-storybook`.

---

## Track P81-D - Remove Mantine and delete the workarounds

### Problem

Six pieces of this codebase exist only to make Mantine fit: `adapter.ts` (601 lines, 31 override blocks), `chromeTheme.ts` (162 lines), `chrome-portable.scss` (117 lines), `AdminChromeProvider`, `adminChromeStyles()`, and the `--mullion-builder-*` inline bridge. Several P77 guards are written against their existence.

### Fix

Delete them, drop `@mantine/core`, `@mantine/hooks`, `@mantine/modals`, `@mantine/notifications` and `@mantine/form` from `package.json`, and remove Mantine's stylesheet imports from `main.tsx` and `shadowStyles.ts`.

Retire `option-checked-bg` and `option-checked-color` from the component-token tier. The framework's select marks a selected option with a check and `primary-text` rather than a fill (P80-B, under standing rule 8), so the only readers left are the Mantine adapter and `chrome-portable.scss`, and both go in this track.

`@mantine/dates` goes too, and it can go at any time: P78-A found it has zero importers anywhere in `src/`, `packages/`, `e2e/` or the stories, so it is a dependency the tree already does not use. It is excluded from the P78-A lint rule for the same reason, a rule with no subject being noise.

Retarget rather than delete the guards that still describe something true: the style-delivery tests, the P77-F ring walk and the 1.4.11 audit all continue to hold, against framework tokens instead of Mantine variables. Delete only the guards whose subject is gone, such as the `styles`-prop flatness tests, and say so in this document so their absence is not later read as a gap.

### Acceptance criteria

- No `@mantine/*` in `package.json` or in any import, or a written reason and a shrinking allow-list for any residue.
- The P77-A delivery guards, the P77-F ring walk and the 1.4.11 audit all still pass, retargeted.
- Every deleted guard is listed here with why its subject no longer exists.
- Bundle measured before and after, so the change is a number rather than an expectation.

### Validation

- Full suites twice, `npm run build`, `npm run size-check`, and a rebuilt plugin checked on the dev site.

---

## Follow-On Candidates

| Candidate | Why it is deferred |
|-----------|--------------------|
| Publishing `@mullion/ui` | A product decision, and it converts an internal API into a public commitment. Worth deciding after the framework has shipped in the product, not before. |
| Dropping `@mantine/dates` | Listed in Phase 80's follow-ons; confirm it is genuinely unused before removing. |
| ~~Row-selection keyboard support in `Table`~~ | **Moved into P81-B 2026-10-02.** The gap is `SpaceManagementView`'s `<tr onClick>`, and migrating that screen while keeping it would fail this phase's own per-batch keyboard pass. Only the keyboard fix moved; the screen's wider UX pass stays in FUTURE_TASKS. |

## Implementation Notes

_None yet, phase is Planned._

## Outcome

_Pending._
