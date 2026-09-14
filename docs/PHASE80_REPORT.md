# Phase 80 - Behavioural components

**Status:** In progress (P80-A's overlay batch landed; its input-family batch and P80-B/C are Planned)
**Created:** 2026-09-10
**Last updated:** 2026-09-13 (P80-A overlays: Modal, Drawer, Popover, Tooltip and Menu on Base UI 1.8.0)

### Tracks

| Track | Description | Status | Effort |
|-------|-------------|--------|--------|
| P80-A | Overlays and the input family: the components the theme adapter fights hardest | **Overlays done** (2026-09-13), input family Planned | Large |
| P80-B | Selection, navigation and choice controls: the select family, tabs, accordion, checkbox, switch, chip, segmented control, slider | Planned | Large |
| P80-C | Imperative managers: notifications and confirmations | Planned | Small-Medium |

---

## Rationale

1. **What this phase builds.** Every `@mullion/ui` component that handles a keypress. The provider, tokens, delivery and presentational primitives exist from Phase 79; the primitive library was chosen in P78-B. This phase wraps that primitive, thinly, and styles it from tokens.

2. **Why overlays and inputs go first.** Every one of Phase 76's five visual defects lived in this set, and so did P77-C's three dead state rules. If the framework's design is wrong, these are the components that reveal it, and they reveal it while the phase is small enough to change direction. The alternative, starting with the easy components, would prove nothing and would leave the hard cases to a phase with no slack.

3. **Why the wrapping stays thin.** The study's principle 6 is a limit, not a preference. The moment a wrapper starts writing its own combobox semantics or focus trap, it inherits the class of correctness problem this codebase has already demonstrated it gets wrong: P76-I-1 shipped 18 dead style blocks and a WCAG 2.4.7 failure, and two tests were green while asserting a code path that never rendered. Each place where the framework does write real interaction code is named in the study's section 4 and is reviewed as behaviour, not as styling.

4. **Success.** A focused control paints the two-tone ring on every theme and in every scope. A drawer opens in the overlay root, traps focus, dismisses on Escape and outside click, and returns focus to the trigger inside the gallery shadow root, which is a defect the product has today. A select's checked option takes its colour from a token rather than an inline style.

## Key Decisions

| # | Decision | Resolution |
|---|----------|------------|
| A | Compound parts or flat props? | **Both.** Compound parts where the primitive has them, plus a flat convenience component for the common case, because 26 files use the flat Mantine `Select` form and rewriting them into parts is migration cost with no benefit. The flat form is a wrapper over the parts, never a fork of them. |
| B | Does this phase migrate any consumers? | **No.** Components are built and proved in Storybook and tests. Consumers move in Phase 81. Mixing the two would make every component's completion contingent on a file migration, and would put pixel movement and behaviour change in the same diff. |
| C | How is a component proved done? | **Four gates:** the axe structural gate, the P77-F ring walk, the P79-B static sheet tests, and a manual keyboard pass recorded in `ACCESSIBILITY_MANUAL_AUDIT.md`. A component with green unit tests and no keyboard pass is not done. |
| D | What about components the primitive lacks? | **Named, owned and reviewed as behaviour.** Resolved 2026-09-11 by P78-B's pick of Base UI 1.8.0, so the gap list is no longer conditional: **pagination** (10 files), **tags input** (5 files) and **colour picker** (20 files). Pagination is a button list with roving focus and is cheap. Tags input is Base UI's `Combobox` plus chips. The colour picker is a saturation and hue surface and is a component in its own right, so P80-B should budget for writing or vendoring it rather than wrapping it. Each gap carries the same four gates. |
| E | Do the notification and confirmation managers keep their call shape? | **Yes.** `notify.show()` and `confirm()` mirror the 48 and 11 existing call sites, so Phase 81's migration of those sites is mechanical rather than a rewrite. |

## Execution Priority

1. **P80-A**, and it is the phase's real risk. Land it before anything else so a design problem surfaces early.
2. **P80-B** second, in the order the adapter fights hardest: select family first (P77-C's `data-checked` and the unforwarded `vars` both lived there), then tabs and segmented control, then the simple choice controls.
3. **P80-C** last and independently. It is small, it has no styling subtleties, and it can slip without blocking anything.

---

## Track P80-A - Overlays and the input family

### Problem

`Modal`, `Drawer`, `Popover`, `Tooltip` and `Menu` are where the shadow-plus-portal boundary bites, and `Input`, `TextInput`, `Textarea`, `PasswordInput`, `NumberInput` and `ColorInput` are where P76-D/H collapsed the borders and P76-I-1 killed the focus indicator. The adapter's single `Input` entry reaches six components at once because Mantine renders them all through one component, and reproducing that coupling is not a goal.

### Fix

Wrap the primitive's dialog, popover, tooltip and menu, taking the portal container from the provider rather than each call site. Wrap its field and input primitives, with our own label, description and error composition. `Textarea` autosize is ours; it is named in the study's section 4 as behavioural code we write.

The number field takes a **unit slot as a first-class part**. Today `UnitScrubField` posts a `variant="unstyled"` `Select` into a Mantine `NumberInput`'s `rightSection`, sized by a hand-computed width and held together by four `styles` overrides forcing `height: 100%`; the seam between the two controls is visible and the field is taller than its neighbours. That is the blocker for the Typography panel redesign claimed by P81-B, so the slot has to exist here rather than be improvised there.

Every state that used to need an inline colour is a token read by a data-attribute selector, per study principle 2.

### Acceptance criteria

- Each overlay renders in the overlay root, traps focus, dismisses on Escape and outside click, and returns focus to the trigger when the trigger is inside the gallery shadow root.
- The P77-B hostile-host probe passes: transformed ancestor, page scrolled 600px, sticky header at `z-index` 9999.
- Input borders resolve from tokens in both colour schemes and both theme modes, which is the P76-D/H regression.
- A focused input shows the focus border, and a focused control shows the two-tone ring, on all 23 themes.
- Every part that takes focus carries `data-mullion-focus`, by spreading `focusable` from `@/ui/components` onto it. The ring rule in `src/ui/styles/focus.css` matches Base UI's `data-focus-visible` only together with that attribute, so a wrapped part without it paints no ring (recorded by P79-0, 2026-09-13).
- The four gates in Key Decision C, for every component.

### Validation

- `npx vitest run`, `npx playwright test` twice, `theme-qa` ring walk, the axe gate, and the recorded keyboard pass.

---

## Track P80-B - Selection, navigation and choice controls

### Problem

This is where P77-C found three rules that had never painted: a Select option rule targeting an attribute Mantine does not set, and Tabs and SegmentedControl colours outranked by the adapter's own inline styles. The components are also the ones with the most intricate keyboard contracts in the product.

### Fix

Wrap the primitive's listbox, combobox, select, tabs, accordion, checkbox, switch, toggle group and slider. `Chip` is a styled checkbox. The segmented control's moving indicator is ours and is named as behavioural code. Pagination is ours if the chosen primitive lacks it.

### Acceptance criteria

- A checked select option takes its colour from a token, and the rule survives a mutation of the attribute name, which is the P77-C guard generalised.
- Tabs and segmented control resting and active colours come from tokens, with no inline colour on the part, enforced by the P79-B static test.
- Keyboard contracts verified per component against the ARIA Authoring Practices: typeahead, roving focus, Home and End, page keys on the slider.
- The four gates in Key Decision C, for every component.

### Validation

- As P80-A, plus a per-component keyboard pass recorded in the manual audit.

---

## Track P80-C - Notification and confirmation managers

### Problem

`@mantine/notifications` is called from 21 files with 48 `show` calls, and `@mantine/modals` from 10 files with 8 `openConfirmModal`. Both are imperative stores with their own stylesheets, and both are thin.

### Fix

A `notify` store over the primitive's toast, and a `confirm()` over the framework's own dialog, both keeping the existing call shape so Phase 81's migration is a find and replace rather than a rewrite. Notification visuals are framework components reading tokens.

### Acceptance criteria

- `notify.show`, `update`, `hide` and `clean` cover every existing call site's options.
- `confirm()` covers the eight `openConfirmModal` shapes in use.
- Toasts render in the overlay root and are announced to assistive technology.
- The existing untranslated-notification gate still passes.

### Validation

- `npx vitest run` including the notification gate, plus an axe pass on a rendered toast and confirm dialog.

---

## Follow-On Candidates

| Candidate | Why it is deferred |
|-----------|--------------------|
| Migrating consumers onto these components | Phase 81, by Key Decision B. |
| **`FileButton`'s hidden file input has no accessible name** | P79-C, found by P80-A's axe scan of the showcase. `<input type="file" class="mullion-visually-hidden" tabindex="-1">` fails the `label` rule at critical impact. It is a real defect in a shipped framework component and it is one attribute to fix, but it is P79-C's component and not an overlay; it belongs with the input family in the rest of P80-A, where the field and label composition is being written anyway. |
| **The menu's ground is audited; the audit just leaves no headroom** | P80-A, 2026-09-13, correcting the row below. `menu-bg` derives from `surfaceRaised`, which **is** the fourth ground `textRung` selects against: 0 of 138 semantic pairs fail on it untinted. The worst is 4.53, because the routine stops at the *nearest* rung clearing 4.5:1 rather than maximising, so the tightest theme lands 0.03 above the floor by design. That is why a 1% tint breaks it. The designer's note reasoned from a `flat` column in the outgoing brief that measured `surface` only, and concluded the ground was unaudited; the correction is in `docs/design/correspondences/tinted-grounds-answers-2026-09-13.md`. |
| **The focus ring already covers the menu row on 20 of 23 themes** | P80-A. Menu items carry the focus attribute, so the ring paints under arrow-key navigation (measured in Chromium) and a pointer hover paints the tint alone. Against the *highlighted* row the pair clears 1.4.11's 3:1 on 20 of 23 themes, usually because the halo carries it where the core cannot. It fails on nord (2.87), tokyo-night (2.91) and gruvbox-dark (2.75), where the tint dims both tones at once. The halo is derived against the surface and nobody derived it against a lightened row. Open with the designer: a rail, a halo re-derivation for those three, or both. |
| **The tinted-ground finding was 41 parts wrong and 58 parts mine** | P80-A, 2026-09-13, and it supersedes the two rows below. The `light` variant does **not** paint semantic text on a tinted ground: P79-C settled that with a rule written into `control.css` ("tint the ground or colour the ink, never both"), so `Button`, `Badge`, `Alert` and `Chip` all paint `--mullion-color-text` on the wash. The only two rules painting a tone on a wash are icons, which answer to 1.4.11's 3:1 and clear it on **0 of 138 below 3:1** at both strengths. So the 8 and 33 wash failures were measured against a pairing the framework never renders, and the designer's option D, which was designed to fix them, is withdrawn rather than deferred. The real defect is `.mullion-menu-item[data-mullion-tone]`, written in this batch, which colours the ink on a ground that tints: the both-at-once the house rule forbids. Fixed by applying that rule, with a guard. Correction sent as `tinted-grounds-correction-2026-09-13.md`. |
| ~~**Option D is accepted and measured**~~ (withdrawn) | P80-A. The designer rejected repainting the palette (A) and proposed a separate on-wash ink per role, the way `primaryFill` has `primaryOnFill`. Measured: deriving against the 20% ground gives **137 of 138** pairs clearing 4.5:1 at 20% and **138 of 138** at 14%, with **86 of 138** roles needing no separate ink at all. One exception, nord/warning at 4.12 on the hover ground only. Not implemented; awaiting the designer's call on the menu before the batch is scheduled. |
| **Semantic rungs are not selected against any tinted ground** | P80-A. Broader than the menu: the rungs clear 4.5:1 on the four flat grounds they were selected against (0 of 138 pairs fail) and fail on all three grounds the framework actually derives, at 8 of 138 for `tone-wash` (14%), 33 of 138 for `tone-wash-strong` (20%) and 58 of 138 for the menu highlight (8% of `text`). So the `light` variant of Button, Badge and Alert is affected as well as the Menu. Three routes were priced: teaching `textRung` the derived grounds fixes all three and repaints 66 of 138 rungs at a median deltaE of 7.7; weakening `tone-wash-strong` to 10% clears the wash grounds alone; weakening the menu tint cannot work, because at a perceptually invisible 1% five pairs still fail. Written up for the designer as `tinted-grounds-notes-for-designer-2026-09-13.md` in their folder. Blocks nothing in P80-B, but must be settled before P81-B migrates a surface that paints a tone on a tinted ground. |
| **Arrow keys nudge layout-builder slots while you type in a field** | FUTURE_TASKS, product bug. `useLayoutBuilderKeyboardHandlers` attaches a document-level `keydown` while the builder modal is open and handles ArrowUp/ArrowDown by nudging the selected slots, with **no guard for the event originating in an `input`, `textarea` or `contenteditable`**. Typing in any field inside the builder therefore moves slots. Found while diagnosing the Select defect below; it is not the cause of that one, because a document-level bubble listener runs after React's root handler and cannot suppress it. |
| **The ring's reach is 6px, not 10px** | P80-A, corrected 2026-09-14 by the designer measuring the live component. The outline sits at `outline-offset: 2px` and is 2px wide, so its outer edge is 4px beyond the border box; the halo is a `box-shadow` with a 6px spread, painted behind. **They do not stack** — the reach is `max(4, 6)`, not `4 + 6`. The wrong figure came from this batch and it survived because the e2e that produced it *computed* `outlineWidth + outlineOffset + spread` rather than measuring painted extent, so a formula was reported as a measurement. Consequences: the menu row is clipped by **5px** per inline edge, not 9px; the tab bar by 6px top and bottom; and the padding fix, if ever taken, is 6px rather than 10px. |
| **More clipped rings: Typography panel and Admin Panel** | Reported 2026-09-14 from the manual pass: `Show Title` and `Show Subtitle` in the Typography panel lose the ring's **left** edge, and the Admin Panel rings are still cut. Same class as the menu row and the tab bar — an outset indicator needing 6px of clearance inside a container that clips or a control flush to its edge. Not separate defects; they are the population the inset ring variant exists to serve, and they are the argument for doing it before the rail. Enumerate every clipped instance when the variant lands rather than fixing them one at a time. |
| **The tab bar clips the focus ring on three sides** | P80-A/P81-B. `Tabs.List` in `AdminPanel.tsx` carries `overflowX: 'auto'`, and once one axis is not `visible` the other computes to `auto`, so the bar clips vertically too. The ring itself is correct: `theme.focusRing` is unset and therefore `'auto'`, so tabs get `.mantine-focus-auto` and `:focus-visible`; the `[data-active]` rule sets only `color`. So this is a correctly applied ring made unreadable by its container, the second instance of the class after the menu row. The designer's inset ring variant is the once-and-properly fix. Confirmed on the live component 2026-09-14: a mouse click paints no ring, an arrow key paints it, and arrow keys move focus and selection together, which is why a keyboard user's screenshot reads as a selection mark. Note two things: `.mantine-focus-always:focus` in `chrome-portable.scss` has never matched anything, since nothing sets `focusRing: 'always'`; and Mantine's base `Tabs.css` **already draws the active underline** via `--tab-border-bottom-color`, with inactive tabs holding a transparent 2px so nothing shifts. So the tab-bar job is three small changes, not a redesign: fix the ring, give the tablist a 1px bottom rule for the underline to seat on, and bump the active label's weight. |
| **Every dropdown in the product is keyboard-inoperable in the shipped configuration** | **CONFIRMED 2026-09-14, severe, product-wide.** `?portal=shadow` restores arrow-key selection; `?portal=document` and the shipped `overlay-root` default do not. Mechanism, read from Mantine's source: `use-combobox` resolves `const root = getRootElement(targetRef.current)` **from the trigger**, then finds the active option with `findElementBySelector('#listId [data-combobox-active]', root)`. Mantine supports shadow DOM, but only when trigger and dropdown share a root. Our default portals the dropdown into a *separate* shadow root (the overlay root), so the lookup returns null and every arrow key is a no-op; `document` mode fails too, because `document.querySelector` does not pierce the overlay root. This is our architecture (P77-I), not a Mantine defect. It reaches `Select`, `Autocomplete`, `MultiSelect`, `TagsInput` and `TreeSelect` — 26 files — and it is a WCAG 2.1.1 failure on every one. **Awaiting a decision on the remedy** (see the P80-A notes). It is also the binding constraint on P80-B: Base UI's parts use ID-referenced ARIA the same way, so the select family must keep its listbox in the trigger's root. |
| ~~**ID-based ARIA cannot cross the overlay-root boundary**~~ (superseded by the row above) | **P80-B blocker.** Found in the P80-A manual pass, 2026-09-14. The default portal mode is `overlay-root`, so a Mantine `Select`'s dropdown renders in the overlay root's shadow root while its input stays in the gallery's: two different trees. `aria-activedescendant` and `aria-controls` are **ID references**, and an ID reference cannot resolve across a shadow boundary. Reported symptoms on the Typography panel's Font and Theme selects: NVDA announces "blank" on every arrow key, typing filters the list but no option can be chosen, and the arrow keys move the text caret instead of the highlight. The shadow-boundary cause is a strong hypothesis and is **not yet confirmed**; the decisive test is `?portal=shadow`, **not** `?portal=document`: `document` mode sets the portal target to null so Mantine falls back to `document.body`, which is still outside the gallery's shadow root, and only `shadow` mode keeps the dropdown in the trigger's own tree. `?portal=document` was tried on 2026-09-14 and changed nothing, which is consistent with the hypothesis rather than against it. Measured separately: a bare Mantine `Select`, searchable and not, passes the full keyboard contract under the app's own test providers in jsdom (options open, `aria-activedescendant` is set on ArrowDown, Enter selects), so the component is not generically broken and the cause is environmental. This is the same class as the `aria-owns` finding below, so **Base UI will hit it too**: P80-B's select family must either keep the listbox in the trigger's own tree or avoid ID-referenced ARIA. Confirm before building, not after. |
| **Filled-and-flush controls have no working ring geometry** | P81-B / layout. Enumerated by the designer on the live Admin Panel: `Add Media` (solid fill, **0px clearance**, inset pair measures 2.91 and fails 3:1), `Rescan Types` (0px clearance) and the Media sort mode (3px). The outset ring is clipped by the container and the inset variant does not clear on a solid fill, so **neither geometry works**. The adopted rule: filled controls take the outset ring and must be given at least 6px of clearance, since the outset halo meets the surface rather than the fill; flush controls on neutral or washed grounds take the inset ring; **filled *and* flush is a layout defect rather than a ring variant**. These three are layout tickets. |
| **`aria-owns` across a shadow boundary** | Base UI points `aria-owns` at an id in another shadow root for iOS VoiceControl, which axe reports as `aria-valid-attr-value` at critical impact and which cannot resolve in the accessibility tree. Worth confirming in P80-B against a real screen reader before deciding whether it needs a workaround. |
| **Tab order jumps backwards in the gallery main area** | FUTURE_TASKS, product a11y. Found in the P80-A manual pass, 2026-09-14: tabbing forward goes Typography icon, then **left** to Access Mode, then **left** again to the campaign filters group, so forward Tab moves backwards on screen. That is a WCAG 2.4.3 focus-order failure. Not a framework defect: none of these controls is a framework component yet. It wants a DOM-order fix on the surface itself, and it should be re-checked after P81-B migrates that chrome rather than patched twice. |
| **A deploy breaks any open tab** | FUTURE_TASKS, robustness. Found 2026-09-14 while testing: an open tab holds an entry bundle from the previous build, and a lazily imported route chunk it asks for has been deleted by the new one, so the error boundary shows "Something went wrong / error loading dynamically imported module". The deployed build was verified self-consistent and the service worker correctly declines to cache hashed assets, so this is purely a stale client and a reload fixes it. The product fix is the usual one: catch a dynamic-import rejection at the route boundary and reload the page once before surfacing an error. Cheap, and it removes a class of support report. |
| **`link-in-text-block` on an `Anchor` inside muted `Text`** | P79-0's tone probe measures 1.11:1 between the link and its surrounding text with no underline, which is a serious axe violation. It may be fixture-only: the probe is a deliberate tone composition rather than a product screen. Confirm against a real surface during P81-B, and if it reproduces, the fix is a rule on `Anchor` rather than a theme change. |
| `Table` as a behavioural component | It is presentational in this product; row selection keyboard support is a separate FUTURE_TASKS entry and a real a11y gap, and it should be fixed as a feature rather than smuggled into a migration. |
| Date pickers | `@mantine/dates` is a dependency but no date component appears in the measured import inventory. Confirm before Phase 81 and drop the dependency if genuinely unused. |
| Dropping `@mantine/hooks` | Seven hooks, about 150 lines. Cheap, and it can wait for Phase 81's removal track. |

## Implementation Notes

### P80-A, overlays batch (2026-09-13)

**Status: landed.** `Modal`, `Drawer`, `Popover`, `Tooltip` and `Menu` in [`src/ui/components/overlay.tsx`](../src/ui/components/overlay.tsx) with [`overlay.css`](../src/ui/components/overlay.css), on `@base-ui/react` 1.8.0. The track's input family is not in this batch and is still Planned. 36 unit tests, 13 browser tests, four Storybook stories and an opt-in showcase section cover it; five mutations were applied and caught.

**What the wrapper does, in one rule.** Base UI owns every keypress: the focus trap, the scroll lock, the dismissal reasons, the roving focus and typeahead in a menu, and the anchor positioning. This module supplies four things and nothing else: the portal container from `useMullionPortal()`, the class names, the focus attribute, and a sheet that reads tokens. That is study principle 6 held literally, and the one thing it buys is the phase's stated success criterion: a popup is inside an element carrying the nearest provider's tokens whatever tree its trigger lives in, so nothing is mirrored inline the way `adminChromeStyles()` does today.

**What the measurement changed about the plan.**

| Plan said | Built |
|-----------|-------|
| "Wrap the primitive's dialog, popover, tooltip and menu" | As planned, and `Drawer` is the **dialog** with a different resting position rather than Base UI 1.8.0's own `Drawer`. That primitive is a swipe-dismissible mobile sheet with indent backgrounds and virtual-keyboard handling; the product's two drawers are settings panels. P78-B measured the dialog shape, so this is the shape that was proved. |
| Key Decision A, "compound parts plus a flat convenience component" | Applied per component from the call sites rather than uniformly. `Modal` (26 sites), `Drawer` (2) and `Tooltip` (115) are flat because every existing site is; `Popover` (5) and `Menu` (12) are compound because every existing site is. Building both surfaces for all five would have doubled the test surface to serve no call site. |
| The parts would carry Mantine's names | They carry ours: `Trigger` and `Content`, not `Target` and `Dropdown`. P78-A's barrel already established that a vendor's vocabulary does not become the framework's, and Phase 81 rewrites these 17 call sites anyway under its refresh budget. |
| `openDelay` maps onto the tooltip root | Base UI 1.8.0 puts `delay` on `Tooltip.Provider` and not on `Tooltip.Root`, so a per-tooltip delay is a provider per tooltip. That is a context value and nothing more, and it keeps `openDelay` meaning what it means at the 16 sites that set one. `Tooltip.Group` is the shared-delay form. |
| A `modal` boolean | `boolean \| 'trap-focus'`, passed through unchanged. The first draft mapped `false` onto `'trap-focus'` and documented it as "leaves the page interactive", which is wrong in the way that matters: measured in Chromium, `'trap-focus'` still sets `aria-hidden` on the rest of the page. Remapping a primitive's three-valued option onto two was lossy, and passing it through is both thinner and honest. |
| The menu would have a `Separator` part | Base UI's menu has none, so `Menu.Divider` is the standalone `Separator` primitive, which carries the `role="separator"` the grouping needs. |

**Five defects found while building, four of them mine.**

1. *`Menu.Label` threw.* Base UI's `GroupLabel` requires a `Menu.Group` ancestor and throws without one; the product's four `Menu.Label` call sites are bare headings with no group. A component that throws at its existing call sites is not a migration path. `Menu.Label` is now a plain styled element, and `Menu.Group label=...` is the accessible form that actually names the items it heads.
2. *The default triggers were invalid markup.* `render={<span />}` on `Menu.Trigger` and `Popover.Trigger` without `nativeButton={false}` left Base UI still assuming a native button: it stamped `type="button"` on a `<span>` with no `role`, so the control was unannounced. Letting Base UI render its own `<button>` is simpler and correct. The tooltip trigger stays a `<span>`, because its 115 call sites wrap a control that is already focusable and a button inside a button is invalid; Base UI adds no `type` or `tabindex` there, measured.
3. *Six parts dropped every prop they did not own.* `Menu.Content`, `Menu.Item`, `Menu.Label`, `Menu.Divider`, `Menu.Group`, `Popover.Content` and `Tooltip` swallowed `data-testid` and any `aria-*`. This is the rule P79-C established and P79-0 found broken again in `Collapse` and `Table.ScrollContainer`; it is now a test that names the offending part.
4. *Invented tokens.* The first draft of the sheet read `--mullion-color-overlay`, `--mullion-color-tooltip-surface`, `--mullion-color-surface-hover` and `--mullion-line-height-heading`, none of which the engine emits. The colour-literal guard in `componentSheets.test.ts` caught the fallback literal; the rest were caught by enumerating what `buildTokenSheet` actually writes. Every one is now a real token, and the two the tier lacked were added to it (below).
5. *`Tooltip.Group` did nothing.* Every `Tooltip` wrapped itself in a `Tooltip.Provider`, including the ones setting no delay, and a provider with no `delay` resets to Base UI's default rather than inheriting an ancestor's. The group component existed and had no effect. A tooltip now wraps only when it sets a delay of its own. The first guard written for this passed against both the fix and the mutation, because `findByText` waits long enough for the default delay to satisfy it either way; that is the P76-I failure mode (a green test asserting a path that never ran), so it was rewritten to query without waiting, which is the only form that can tell a zero delay from a default one.
6. *A shipped engine defect, not mine.* See the next block.

**`menu-hover-bg` has never had a value.** Adding `overlay-bg` to the component-token tier produced a backdrop that painted `rgba(0, 0, 0, 0)` in Chromium while the token read back as the empty string. The cause is in the emitter: `cssVariables.ts` ran every component token through `sanitizeCssValue`, a blacklist that rejects `/`, and chroma-js 3's `.css()` emits the modern space-and-slash form (`rgb(0 0 0 / 0.08)`). Every alpha-derived component token was therefore written as `inherit`, silently. That is `menu-hover-bg`, shipped by P78-C on 2026-09-11 and never painted since, which nothing caught because no framework component read it until this track's `Menu`. The fix tries `sanitizeCssColor` first, a whitelist that allows `/` inside a colour function and is strictly stricter for anything it accepts, and falls through to the generic sanitiser for the non-colour tokens in the tier. The guard is a new per-theme test asserting what reaches the **emitted CSS** rather than what the derivation returns, which is the gap the defect lived in; mutating the emitter back fails it on all 23 themes.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically afterwards.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| the vendor boundary reaches the primitive | a `@base-ui/react` import added to a new file in `src/` | two tests fail, both naming the file |
| Mantine stays in the barrel | a `@mantine/core` import added to `overlay.tsx` | the barrel test fails naming the file; the primitive test stays green, which is the split working |
| every part forwards what it does not own | `{...rest}` dropped from `Menu.Content` | the forwarding test fails naming `menu-content` |
| a colour token survives into the emitted CSS | the emitter put back to `sanitizeCssValue` alone | the new emission test fails on all 23 themes, naming `overlay-bg` and its derived value |
| `Tooltip.Group` is inherited | the per-tooltip provider made unconditional again | the group test fails |
| the ESLint boundary | a `@base-ui/react` import in a probe file | lint errors with the boundary message |

**Three tokens added to the tier (P78-C's shape, not a redesign).**

| Token | Derivation | Why |
|-------|-----------|-----|
| `tooltip-bg`, `tooltip-color`, `tooltip-bd` | `surfaceRaised`, `text`, `border` | Lifted verbatim from the adapter's `Tooltip.styles.tooltip`, which paints the raised surface with ordinary text rather than the inverted chip most libraries default to. The framework's tooltip keeps looking like the product's. |
| `overlay-bg` | black at 0.6 | The second documented exception after `control-height-*`, and deliberately not role-derived. Mantine's `Overlay` defaults to black, the two call sites that set an opacity both pass 0.6, and that is what ships today on all 23 themes. Deriving it from a role would make the scrim white on a light theme, which is a redesign and a worse scrim. A theme can still override it. |

**Two contrast pairs added, and one deliberately not added.** `text on surfaceRaised` and `textMuted on surfaceRaised` joined the 1.4.3 text audit: every portaled panel in the product (menu, popover, tooltip) derives its ground from that role, menus have painted text on it since long before the framework, and nothing had ever named the pair. Measured across all 23 themes before adding, the worst is 5.54 and 5.10, so it pins behaviour rather than changing it. A `tooltip-bd on tooltip-bg` pair was considered for the 1.4.11 audit and rejected on measurement: it ranges 1.00 to 2.46 on 20 of 23 themes, because a panel's own border against its own fill is decoration and not a "user interface component or state" boundary. Adding it would have failed 20 themes against a requirement WCAG does not make.

**The boundary now fences the primitive.** `@base-ui/react` joined `RESTRICTED_PACKAGES` on its first day, which is the only moment at which no file outside `src/ui/` imports it. The allow-list did not grow (178 files, unchanged) because none does. This split one rule into two, and the split is the point: Base UI may be imported by any framework module, because that is where components are built, while Mantine may still only be named by the barrel, because a framework component building on the library being removed is the thing worth preventing. Both halves are proved by mutation.

**Two e2e failures that were the test's fault, recorded because the next batch will hit them.**

1. *The focus trap looked broken and is not.* Twelve back-to-back `Tab` presses recorded three stops on real buttons behind an open drawer. Base UI contains focus by letting the browser move it to a guard and then redirecting, which settles over a frame or two, and synthetic input with no gap outruns it. At a 120ms cadence all twelve stops stay inside the drawer, on both the shadow and the light mount. The test now tabs at a human cadence and says why in a comment.
2. *"The modal is not in the overlay root" when it was.* The hostile-host probe queried `document.querySelector` for a fixture element that renders inside the gallery shadow root on a shadow mount. The helper now walks shadow roots, and the stacking assertion uses `elementsFromPoint`, which returns shadow hosts, rather than `elementFromPoint` and `contains`.

**Turning `menu-hover-bg` on exposed a colour-model gap, and it is the one open question in this batch.** With the token painting for the first time, axe reported a contrast failure on a `tone="danger"` menu item: on default-dark, `error-text` is 4.75:1 on the menu ground and 3.74:1 on the highlighted one. Chasing it showed the menu is not the extent of it. `textRung` selects each semantic rung against four **flat** grounds (`background`, `surface`, `surface2`, `surfaceRaised`) and the framework paints those rungs on three **derived** grounds that no rung was ever selected against.

| Ground | How it is built | Where it shows | Pairs below 4.5:1 | Themes |
|--------|-----------------|----------------|-------------------|--------|
| flat surfaces (the control) | — | everywhere else | **0 of 138** | 0 of 23 |
| `tone-wash` | role at 14% into `surface` | resting `light` variant: Button, Badge, Alert | 8 of 138 | 5 of 23 |
| `tone-wash-strong` | role at 20% into `surface` | hover of those same controls | 33 of 138 | 16 of 23 |
| menu highlight | `text` at 8% into `menu-bg` | any dropdown row under cursor or arrow keys | 58 of 138 | 22 of 23 |

Plain `text` is unaffected: its worst on the menu highlight is 4.73. Only the six semantic rungs sit close enough to the floor for a tint to push them under. `light` is the second most-used variant in the product at 131 call sites, so this is not a rare state.

**This is deliberately not fixed here, and the three routes are priced rather than chosen.** Teaching `textRung` the derived grounds closes all three and repaints **66 of 138** rungs at a median deltaE of 7.7 (max 9.3), which is a visible change to colours carrying a P76/P77 designer sign-off. Weakening `tone-wash-strong` from 20% to 10% closes the wash grounds alone (0 of 138, worst 4.53). Weakening the menu tint cannot work at all: at 1%, which is perceptually invisible at deltaE 0.4 to 0.6, five pairs still fail, because the margin on the menu's own ground was already too thin for the tint to be what broke it. What a highlighted row should look like instead has no engineering answer. Written up with the full per-theme table as `tinted-grounds-notes-for-designer-2026-09-13.md` in the designer's folder.

**Two corrections came back on 2026-09-13**, both recorded in `docs/design/correspondences/tinted-grounds-answers-2026-09-13.md`. The deltaE figures above are **CIEDE2000**, which is what `chroma.deltaE()` computes; in CIELAB deltaE*ab, the unit the designer's own tables use, option A's repaint is a median of **11.7** and a max of **24.8** rather than 7.7 and 9.3, so it is worse than first reported. And the outgoing brief's `flat` column measured `surface` alone rather than the four-ground list the selection actually uses, which led the designer to conclude the menu's ground was unaudited; it is audited, and the real mechanism is that the routine stops at the nearest passing rung and so leaves as little as 0.03 of headroom. Option A is dropped on the designer's call; option D is accepted and measured. Nothing consumes these components yet (Key Decision B), so nothing ships with the failure.

**The axe gate is scoped, and scoping costs the contrast rule.** `include` is chained through the overlay root's shadow host, because axe does not cross a shadow boundary with a plain selector and reports "No elements found" instead. Scoping to the popup also means axe cannot resolve the background stack above it, so `color-contrast` does not run inside the gate: the finding above came from a full-page scan, not from the gate. The gate therefore proves structure (roles, names, ARIA validity) for the overlays and does **not** prove their contrast. That is a real limit of this gate and the ring walk and the engine audits are what cover colour.

**Two Base UI artefacts a full-page scan reports, excluded by that scoping.** `aria-hidden-focus` on six `<span aria-hidden="true" tabindex="0" data-base-ui-focus-guard>` elements, which is the focus-trap pattern every library in this class uses, and `aria-valid-attr-value` on a `<span aria-owns="_r_m_">` whose target sits in a different shadow root, so axe cannot resolve the id. Both are the primitive's own machinery rather than markup this module writes. The second is worth a second look in P80-B, because `aria-owns` genuinely cannot cross a shadow boundary in the accessibility tree and Base UI uses it for iOS VoiceControl.

**Two P79-C findings with a home, not fixed here.** A full-page axe scan of the showcase reports two critical/serious violations that belong to the presentational set rather than to the overlays: `FileButton`'s hidden `<input type="file">` ([control.tsx:279](../src/ui/components/control.tsx#L279)) has no accessible name, and the fixture's tone probe puts an `Anchor` inside muted `Text` at 1.11:1 with no underline (`link-in-text-block`). The first is a real component defect; the second may be fixture-only, since it is the P79-0 tone probe rather than a product composition. P80-A's axe gate is scoped to the popup under test so that it measures this track, and both are filed in Follow-On Candidates below.

**Three of the four gates, and the fourth is written down rather than claimed.** Key Decision C counts a component done on the axe gate, the ring walk, the static sheet tests and a recorded manual keyboard pass. The first three are green: the axe gate is four scoped browser scans (with the contrast limit recorded above), the ring is measured on a keyboard-highlighted menu item in Chromium, and the static guards in `componentSheets.test.ts` cover the new sheet with no change to them. The manual pass is **not run**. Its script is now [ACCESSIBILITY_MANUAL_AUDIT.md §6B](guides/ACCESSIBILITY_MANUAL_AUDIT.md), ten checks per story against the four Storybook stories, and until someone works through it these components have three gates of four.

**Validation.** Run at CI parity on the final tree: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run ui:allowlist:check` green at 178 files (the primitive joined the restricted set and the list did not grow), `npm run themes:catalog:check` green, `npx vitest run` 4,202 of 4,202 across 271 files, `npx playwright test` 83 of 83 with no snapshot differences, and `npm run build` clean apart from the pre-existing chunk-size warnings. The unit suite grew by 60 tests and one file against the tree this batch started from (4,142 across 270), and `e2e/ui-overlays.spec.ts` adds 15 browser tests. The `theme-qa` and `ui-showcase` baselines are untouched, which is what the `?overlays=1` gate is for.

**The finding that came out of this, corrected twice, in its final shape.** The batch reported 99 contrast failures across three derived grounds. 41 of them were not real: they measured a semantic text colour on the `light` variant's wash, and `control.css` has said since P79-C that a `light` control tints its ground and therefore paints the theme's plain text on it, never the role colour. The two rules that do put a tone on a wash are icons at the 3:1 non-text floor, which clear on all 138 pairs with 3.82 to spare at worst. The remaining 58 are one rule, written in this batch: `.mullion-menu-item[data-mullion-tone]` coloured its ink on a ground that lightens on highlight, which is the both-at-once that rule forbids, and the menu's ink has as little as 0.03 above the floor to give. Fixed by excluding toned rows from the highlight tint, which is the existing rule applied rather than a new decision, and guarded by a static test that a mutation fails. Re-inking instead was measured and rejected: 57 of 138 colours move at a median CIELAB deltaE*ab of 11.0 and three pairs still fail, because the ramp cannot reach the floor against the lightened ground. The cost of the whole episode was one wasted designer round on an option built to fix the 41.

**One gap the fix introduces, and it is open.** A toned row no longer tints, so it has no pointer-hover affordance; the focus ring covers the keyboard but not the mouse. The designer's proposed 3px leading rail in `primaryStroke` closes it and also answers their separate findability argument, which no contrast fix addresses. It is a visual decision and is with them.

**Rendered output.** Nothing in the product changed: no consumer imports these components, and `@/ui` still re-exports Mantine's overlays (Key Decision B). The showcase's overlay section is behind `?overlays=1` so the existing `ui-showcase` and `theme-qa` baselines render exactly what they rendered before.

## Outcome

_Phase in progress. P80-A's overlay batch landed 2026-09-13; the track's input family, P80-B and P80-C are still Planned._

**What the overlay batch proved about the framework's design.** The phase's Rationale 2 put the overlays first so that a design problem would surface while the phase was still small enough to change direction. It did not surface one. The provider's portal container, the `render` convention, the focus attribute and the tone ladder all took Base UI's components without modification, and the one architectural claim the phase rests on holds in a browser: a popup opened from inside the gallery shadow root paints from the nearest provider's tokens, survives a transformed ancestor and a sticky header at `z-index` 9999, and returns focus across the shadow boundary to the trigger that opened it, which is the defect the product has today.

**What it changed about the plan.** Three things, each recorded above: the drawer is the dialog primitive rather than Base UI's own swipe sheet; the compound-or-flat decision is made per component from the call sites rather than uniformly; and `modal` is the primitive's three-valued option passed through rather than a two-valued remapping that measurement showed was lossy.

**The most useful thing it found is not in the overlays.** `menu-hover-bg` has been emitted as `inherit` on every theme since P78-C shipped it, because the emitter's injection blacklist rejects the `/` in chroma's modern `rgb(r g b / a)` form. Nothing caught it for two days because no framework component read the token. Turning it on then exposed a second, larger gap: the semantic text rungs were never selected against the ground a highlighted menu row paints, and 22 of 23 themes fail AA there. The first is fixed with a guard on the emitted CSS rather than on the derivation, which is the gap it lived in. The second is filed, because every repair is a decision the designer or the user owns.
