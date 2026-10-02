# Phase 80 - Behavioural components

**Status:** In progress (P80-A, P80-B and P80-C complete; P80-D, P80-E and P80-F added 2026-10-02 to close the keyboard gate and the framework follow-ons before Phase 81)
**Created:** 2026-09-10
**Last updated:** 2026-10-02 (Key Decision C redefined, Key Decision E corrected, three tracks added, every follow-on given an owner)

### Tracks

| Track | Description | Status | Effort |
|-------|-------------|--------|--------|
| P80-A | Overlays and the input family: the components the theme adapter fights hardest | **Done** (2026-09-14), less `ColorInput` (see notes) | Large |
| P80-B | Selection, navigation and choice controls: the select family, tabs, accordion, checkbox, switch, chip, segmented control, slider | **Done** (2026-09-14), including the pagination and colour-picker gaps | Large |
| P80-C | Imperative managers: notifications and confirmations | **Done** (2026-09-14) | Small-Medium |
| P80-D | The keyboard gate, automated: a browser suite asserting every component's keyboard contract on the shipped configuration, and §6B of the manual audit extended to every component family | Planned | Medium |
| P80-E | The keyboard gate, manual: one recorded screen-reader pass over every component family | Planned (human) | Small |
| P80-F | Framework defects and decisions that must land before Phase 81 builds on them | Planned | Medium |

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
| C | How is a component proved done? | **Four gates:** the axe structural gate, the P77-F ring walk, the P79-B static sheet tests, and the keyboard gate. The keyboard gate has two halves: an **automated keyboard-contract suite** run in a browser against the shipped configuration (P80-D), and a **manual screen-reader pass** recorded in `ACCESSIBILITY_MANUAL_AUDIT.md` (P80-E). A component with green unit tests and no keyboard gate is not done. *Revised 2026-10-02 by user decision; it was "a manual keyboard pass". Every keyboard check in that pass except the screen reader's actual speech is mechanical, a one-off manual pass is stale the first time the component changes, and Phase 81 changes the code around every one of these components. Only what a screen reader says still needs a person.* |
| D | What about components the primitive lacks? | **Named, owned and reviewed as behaviour.** Resolved 2026-09-11 by P78-B's pick of Base UI 1.8.0, so the gap list is no longer conditional: **pagination** (10 files), **tags input** (5 files) and **colour picker** (20 files). Pagination is a button list with roving focus and is cheap. Tags input is Base UI's `Combobox` plus chips. The colour picker is a saturation and hue surface and is a component in its own right, so P80-B should budget for writing or vendoring it rather than wrapping it. Each gap carries the same four gates. **All three built 2026-09-14, and the pricing held with one correction:** pagination is a button list without roving focus, because the Authoring Practices treat pagination as a set of links and each control is its own tab stop. |
| E | Do the notification and confirmation managers keep their call shape? | **Yes.** `notify.show()` and `confirm()` mirror the existing call sites, so Phase 81's migration of those sites is mechanical rather than a rewrite. Measured 2026-09-14: **42** production `notifications.show` calls in 16 files and **6** production `openConfirmModal` sites. *Corrected 2026-10-02: this row first said 48 and 11; the 48 counted test files and the 11 matched nothing.* |

## Execution Priority

1. **P80-A**, and it is the phase's real risk. Land it before anything else so a design problem surfaces early.
2. **P80-B** second, in the order the adapter fights hardest: select family first (P77-C's `data-checked` and the unforwarded `vars` both lived there), then tabs and segmented control, then the simple choice controls.
3. **P80-C** last and independently. It is small, it has no styling subtleties, and it can slip without blocking anything.
4. **P80-D** next, because it is the regression net for P80-F. Every change F makes is to a component the suite will already be asserting.
5. **P80-F** after D. Two of its items are decisions that change the shape Phase 81 migrates onto, so they must be settled before P81-B touches the call sites, not during it.
6. **P80-E** last. It is the one step that costs a person's time, so it runs once, on the code as it will ship, rather than before F changes it.

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

> **Corrected by measurement, 2026-09-14.** Neither figure was right, and the phase's own Key Decision E states the confirm count a third way. Measured across `src/`, excluding test files: **42** `notifications.show` calls in **16** production files (48 including tests, which is where the plan's number came from), and **6** production `modals.openConfirmModal` call sites, not 8 and not 11. `notifications.update` and `notifications.clean` have **no** production call site at all, and `hide` has exactly one. Separately, `modals.open` and `modals.closeAll` are used in one file that `confirm()` does not cover; see the follow-on table.

### Fix

A `notify` store over the primitive's toast, and a `confirm()` over the framework's own dialog, both keeping the existing call shape so Phase 81's migration is a find and replace rather than a rewrite. Notification visuals are framework components reading tokens.

### Acceptance criteria

- `notify.show`, `update`, `hide` and `clean` cover every existing call site's options.
- `confirm()` covers the eight `openConfirmModal` shapes in use. *(Six, measured.)*
- Toasts render in the overlay root and are announced to assistive technology.
- The existing untranslated-notification gate still passes. *(Necessary but not sufficient: see the implementation note. The gate is keyed on callee names, so it would have kept passing while going blind to the code it guards.)*

### Validation

- `npx vitest run` including the notification gate, plus an axe pass on a rendered toast and confirm dialog.

---

## Track P80-D - The keyboard gate, automated

### Problem

Key Decision C made a keyboard pass the fourth gate for every component, and it has never been run. Two things stand in the way, and only one of them is time.

The script in §6B of `ACCESSIBILITY_MANUAL_AUDIT.md` was written for P80-A's five overlays and nothing else. The input family, all twelve of P80-B's components and P80-C's two managers have no script, so a person working through §6B today would cover 5 of roughly 30 components and believe the gate was closed.

Most of what the script asks a person to do is mechanical. Of its ten checks, nine are key presses and an observation a browser can make, and parts of them are already asserted in scattered places: focus return after Escape for the modal, menu and confirm dialog, the drawer's focus trap, the hostile-host probe, the menu row's keyboard ring, the tab bar's arrow-then-Enter contract and the select family's `aria-activedescendant`. What is missing is not hard: Tab and Shift+Tab containment in the modal and popover, opening by Enter and Space, Home, End, typeahead and disabled-item skipping in the menu, focus return from the drawer and popover, and the tooltip on keyboard focus. Only check 9, what a screen reader actually says, needs a person.

### Fix

One browser suite that states each family's keyboard contract and asserts it, on the showcase fixture, under the shipped `overlay-root` portal default, on both the shadow and the light mount. The shadow mount is the point: focus returning across a shadow boundary and ID-referenced ARIA resolving between roots are the defect classes this framework exists to remove, and neither can occur in Storybook, which renders in the light DOM.

- **The contracts** are the Authoring Practices' patterns as Phase 80 implemented them, including its two deliberate departures: tabs activate manually (arrow moves focus, Enter selects) and the accordion has no arrow-key navigation. Each family gets the checks that apply to it: reach by Tab with the ring painted, open by Enter and Space, focus moved inside, Tab and Shift+Tab contained, Escape closing with focus back on the trigger, the composite keys, the tooltip on focus, the ring on a keyboard move and not on hover, the toast stack reached by F6, and the colour picker's text-field path.
- **Accessibility-tree snapshots** per family (`toMatchAriaSnapshot`) pin what a screen reader is *given*: role, name, state, item count and the live region. That is the half of check 9 a machine can prove. P80-E proves the other half, what is said.
- **Fixtures where a contract has none.** A disabled menu item, a menu long enough for typeahead to mean something, and anything else the contracts need, behind the existing opt-in parameters so no snapshot baseline moves.
- **A showcase a person can open.** The fixture is currently served only by intercepting a route inside Playwright, so nobody can open it in a browser. P80-E's screen-reader pass should run on the shadow mount the product ships, not on Storybook's light DOM, so the fixture gets a dev-server entry.
- **§6B rewritten for every family**: for each, which checks are automated (named by test) and which remain for the screen reader. The coverage tracker row is renamed from "Framework overlays (P80-A)" to the whole framework.

Existing assertions stay where they are. The suite references them rather than restating them.

### Acceptance criteria

- Every component built in P80-A, P80-B and P80-C has its keyboard contract asserted in a browser, on both mounts.
- Each family's contract is mutation-checked: one seeded break per family fails it, and the file is restored byte-identically. The mutation must change behaviour in the browser the guard runs in; P80-B found two that did not.
- No timing guard can pass by waiting, and every settle-poll watches every quantity its assertions read (the P80-C flake).
- §6B covers every family and says, per check, whether it is automated and where.
- The showcase opens in an ordinary browser on the shadow mount.
- Full suites green, no movement in existing snapshot baselines.

### Validation

- `npx playwright test` twice consecutively from a cold Vite cache. The suite is timing-heavy by nature, so one green run is not evidence it is stable.
- The mutation table in the implementation note.

---

## Track P80-E - The keyboard gate, manual

### Problem

What a screen reader says cannot be asserted from this environment. Playwright can pin the accessibility tree a screen reader receives, but not NVDA's or VoiceOver's speech, nor how either treats a live region or a dialog title inside a shadow root. Tools that drive NVDA exist, but they need a Windows machine set up for them and their announcement timing is unreliable; not worth it for one pass. Two perceptual questions also need eyes: whether the highlighted row can be found while arrowing quickly through a long menu, and whether the ring reads at true size on a light and a dark theme (standing rule 9).

### Fix

A person runs §6B's screen-reader script, as rewritten by P80-D, once over every component family: one screen reader (NVDA with Firefox, or VoiceOver with Safari), on the showcase's shadow mount, on one light and one dark theme. Results go into §6B and the coverage tracker; failures go into §7 with an owner.

This is component-level. It does not replace P83-G's product-wide audit, which tests surfaces rather than components.

### Acceptance criteria

- Every family row in §6B has a recorded result with screen reader, browser and date.
- Every failure is in §7 with an owner, and anything that is a framework defect is fixed or filed before Phase 81 starts.
- The coverage tracker row is updated.

### Validation

- The recorded table itself. This track is the person's half of the gate, and its evidence is the record.

---

## Track P80-F - Framework defects and decisions before Phase 81

### Problem

Four of Phase 80's follow-ons are about the framework itself rather than about any consumer. Two are defects in shipped framework components and two are decisions that change the shape Phase 81 migrates onto. All four are cheaper now than after 142 files depend on the current behaviour. The designer's pending answers land here too, because each is a one-line framework change.

### Fix

1. **`FileButton`'s hidden input has no accessible name** (axe `label`, critical). Found by P80-A, deferred to the input-family batch, and not fixed there. The visible button is the control and the input is already `tabIndex={-1}`, so the input should leave the accessibility tree rather than gain a second name. Add `FileButton` to a scoped axe gate so it cannot come back.
2. **Two modals opened in the same commit hide each other from assistive technology.** Each dialog marks the other's portal `aria-hidden` and neither stays exposed (measured in jsdom, P80-C). Opened a commit apart, the topmost is correctly exposed. P80-C sidesteps it by queueing confirmations; nothing stops a consumer rendering two `<Modal opened>` siblings. Find where Base UI's outside-element hiding goes wrong for sibling dialogs and fix it in `Modal`; if it cannot be fixed without forking the primitive, add a development warning and write the constraint down.
3. **One store per page.** `notify` and `confirm` are module singletons and `main.tsx` mounts the hosts once per gallery root. Today's Mantine setup has the same shape, with a consequence the P80-C note underrated: each root's `<Notifications />` renders every toast, so a toast appears in every gallery on the page, and Mantine's modals manager broadcasts on `window`, so a confirm opens once per gallery with one shared `onConfirm`. An admin who confirms both runs a delete or a revoke twice. That mechanism is read from source and the first step is to reproduce it on a two-gallery page. Two fixes keep the defect out of the migration: (a) mount one host per page rather than per root, which keeps Key Decision E's call shape and is the default unless a reason against it appears; (b) scope each store to its provider, which changes the call shape at 42 sites. Either way it lands before P81-B migrates a single call site.
4. **Should the overlays keep portalling out, and what about `aria-owns`?** The overlays portal into the overlay root and the select family deliberately stays in the trigger's root, so the framework has two answers to one question. The select family's hostile-host probe passes without leaving, which weakens the case for the split, and Base UI points `aria-owns` at an id in another root (axe critical, cannot resolve) only on components that leave. Settle both together, with P80-D's suite proving the contracts survive whichever way it goes.
5. **The designer's answers, as they arrive.** Four of the questions in `catching-up-2026-10-02.md` are one-line framework changes: whether `filled` controls default to the role glyph, whether the menu rail is suppressed under focus, the selected-row treatment, and the inset ring's band order, plus the toast's leading-edge tone border. Each lands here when answered. Any still unanswered when the rest of this track is done moves to P81-B with a note, so this track does not wait on correspondence. The elevation ladder is not here: it is an engine change, and its owner is Phase 81.

### Acceptance criteria

- `FileButton` passes a scoped axe gate.
- Two sibling `<Modal opened>` rendered in one commit leave exactly one dialog exposed, the topmost, asserted by role query rather than by DOM presence.
- On a two-gallery fixture, one `confirm()` opens one dialog and one `notify.show()` renders one toast, asserted in a browser.
- The portal question has a recorded answer and the overlays match it.
- P80-D's suite green after every change.

### Validation

- Full suites at CI parity, with each fix's test shown failing before the fix.

---

## Follow-On Candidates

### Where each follow-on went (2026-10-02)

The user's direction: nothing here is deferred past release, and nothing is left without an owner. Each row of the table below is placed in a phase, or marked resolved with the reason. Every placement fitted an existing phase, so no new phase was created. The one item that could still grow into its own track is the elevation ladder, and only if the designer wants three real rungs.

Three rows below say "FUTURE_TASKS" and were **never actually filed there**: the builder's arrow-key nudge, the backwards tab order and the broken-tab-after-deploy. Each is placed in a phase now.

| Follow-on | Owner | Note |
|-----------|-------|------|
| Migrating consumers | P81 | Unchanged. |
| `useBroadcastStaleness` dismisses its own warning | **P81-B** | Named in P81-B with its own acceptance criterion, per user decision 2026-10-02. |
| Two modals in one commit hide each other | **P80-F** | Framework defect. |
| One store per page | **P80-F** | Raised in severity: the confirm case can run a destructive callback twice. Must land before P81-B migrates a call site. |
| `modals.open` and `modals.closeAll` | **P81-B** | `ContextualToolbar` becomes a rendered `<Modal>`. |
| `FileButton` has no accessible name | **P80-F** | Framework defect, axe critical. |
| The menu's ground is audited | Resolved | A correction, no work. |
| Focus ring on the menu row, 20 of 23 themes | Resolved | The rail retired the tint the failing pairs were measured against (P80-A). |
| The tinted-ground finding was wrong | Resolved | The menu-item tone defect it found is fixed with a guard. |
| Option D | Resolved | Withdrawn. |
| Semantic rungs against tinted grounds | Resolved | Superseded by the row above: no framework rule paints a tone on a wash except icons, which clear 3:1. |
| Builder arrow keys nudge slots while typing | **P81-B** | Layout Builder batch. Never filed in FUTURE_TASKS. |
| Ring reach is 6px | Resolved | A correction, adopted as standing rule 7. |
| Clipped rings, Typography panel and Admin Panel | **P81-B** | Admin Panel confirmed fixed 2026-09-14. Typography's left-edge clip goes to the Settings batch, as the user decided on 2026-09-14. |
| Tab bar clips the ring | Resolved | Fixed in P80-A, confirmed on the live site. |
| Tab bar and accordion behaviour changes | **P81-B** | Recorded there so the migration does not read them as regressions. |
| A filled select option | **P81-D** | Retire `option-checked-bg` and `-color` when the adapter goes. The visual change is with the designer. |
| Every dropdown is keyboard-inoperable | P81-B | Already there. |
| ID-based ARIA across the overlay root | Resolved | Superseded by the row above it. |
| Filled-and-flush controls | **P81-B** | Admin Panel batch: `Add Media`, `Rescan Types`, the Media sort mode. |
| `aria-owns` across a shadow boundary | **P80-F** | Settled with the portal question. |
| The elevation ladder | **P81-B** | With the designer; re-sent 2026-10-02. If they want three rungs it becomes an engine track ahead of P81-B's first surface batch. |
| The colour picker has no manual pass | **P80-E** | Part of the screen-reader pass. |
| Should the overlays keep portalling out? | **P80-F** | Decision. |
| Tab order jumps backwards in the gallery | **P81-B** | Gallery batch, a DOM-order fix on the migrated surface. Never filed in FUTURE_TASKS. |
| A deploy breaks any open tab | **P82-D** | New track. Never filed in FUTURE_TASKS. |
| `link-in-text-block` on `Anchor` | **P81-B** | Confirm on a real surface; fix on `Anchor` if it reproduces. |
| `Table` and row selection | **P81-B** | The keyboard gap is `SpaceManagementView`'s `<tr onClick>`; the wp-admin Spaces batch makes it a real control. The rest of that screen's UX pass stays in FUTURE_TASKS. |
| Date pickers | P81-D | Already there: `@mantine/dates` has no importers. |
| Dropping `@mantine/hooks` | P81 | Already decided, Key Decision E. |

### The table as filed

| Candidate | Why it is deferred |
|-----------|--------------------|
| Migrating consumers onto these components | Phase 81, by Key Decision B. |
| **`useBroadcastStaleness` dismisses its own stale-tab warning immediately** | P80-C, 2026-09-14. `autoClose: 0` is a zero-length timer in Mantine, not "keep it up", so the warning that tells the user to close and reopen the tab disappears on the next tick. One character to fix, but fixing it is a consumer change and Key Decision B says this phase makes none. Phase 81's migration fixes it as a side effect, because `notify` reads both `0` and `false` as "keep it up". If it should be fixed sooner it is a one-line change to a production hook, not a framework one. |
| **Two modal dialogs opened in the same commit hide each other from assistive technology** | P80-C, found while building `confirm()`; the defect is P80-A's `Modal`. Each dialog's portal is marked `aria-hidden` on the other's behalf, and the measured result is that neither is exposed. Opened a commit apart the topmost is correctly exposed, so the realistic path (a confirm raised from an open modal) works. P80-C sidesteps it by queueing confirmations; nothing stops a consumer rendering two `<Modal opened>` siblings. |
| **Both managers are one store per page, not one per gallery** | P80-C, 2026-09-14. `notify` and `confirm` are module singletons, so two galleries on one page raise the same toast in both viewports and the same confirm in both trees. Mantine behaves identically today from its own module-level store, so the migration changes nothing and this is parity rather than a regression. Recorded because this codebase has a history of multi-instance defects of exactly this shape, and because the fix, if one is ever wanted, is a store per provider rather than a patch: it is a design change and should be taken as one. **Raised 2026-10-02:** "parity" undersold it. Mantine's modals manager broadcasts on `window` and every root mounts its own `ModalsProvider`, so on a two-gallery page a confirm opens once per gallery with one shared `onConfirm`, and confirming both runs the action twice. Moved to P80-F. |
| **`modals.open` and `modals.closeAll` have no replacement** | P80-C, 2026-09-14. `confirm()` covers the six `openConfirmModal` sites, which is what the track scoped. `ContextualToolbar` also uses `modals.open` for a rename form and `modals.closeAll` to dismiss it: an arbitrary-content modal raised imperatively, which is a different thing from a confirmation and was not in the track. Phase 81 either converts that call site to a rendered `<Modal>` (it is one component with local state, so this is small) or the framework grows an imperative modal store. The first is better and is the recommendation. |
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
| **Two behaviour changes the tab bar and the accordion bring with them** | P80-B, 2026-09-14, recorded so P81's migration does not read them as regressions. Tabs now use **manual activation** (arrow moves focus, Enter selects) where Mantine activates on focus, because the Admin Panel's seven panels each load their own data and the Authoring Practices ask for manual activation in that case; `activateOnFocus` restores the old behaviour per bar. The accordion has **no arrow-key navigation**, because roving focus was removed from that pattern in w3c/aria-practices#3434 and Base UI followed. Neither is a defect and neither is reversible by accident: both have tests asserting the new contract. |
| **A filled select option is a layout defect under rule 8** | P80-B, settled by measurement 2026-09-14 rather than referred. `option-checked-bg` is `primaryFill` and `option-checked-color` is `primaryOnFill`; painting a row with them makes a filled control flush with a scrolling popup's edge, which standing rule 8 calls a layout defect, and the highlight rail then cannot be seen on it: `primaryStroke` equals `primaryFill` on **10 of 23** bundled themes (1.00:1) and clears 3:1 on **one**. The framework's select marks selection with a check and `primary-text` instead, which clears 4.5:1 on all 23 (worst 4.54). The two tokens stay in the tier because the Mantine adapter and `chrome-portable.scss` still read them; they fall out of use when P81 removes that path, and should be retired then rather than now. |
| **Every dropdown in the product is keyboard-inoperable in the shipped configuration** | **CONFIRMED 2026-09-14, severe, product-wide.** `?portal=shadow` restores arrow-key selection; `?portal=document` and the shipped `overlay-root` default do not. Mechanism, read from Mantine's source: `use-combobox` resolves `const root = getRootElement(targetRef.current)` **from the trigger**, then finds the active option with `findElementBySelector('#listId [data-combobox-active]', root)`. Mantine supports shadow DOM, but only when trigger and dropdown share a root. Our default portals the dropdown into a *separate* shadow root (the overlay root), so the lookup returns null and every arrow key is a no-op; `document` mode fails too, because `document.querySelector` does not pierce the overlay root. This is our architecture (P77-I), not a Mantine defect. It reaches `Select`, `Autocomplete`, `MultiSelect`, `TagsInput` and `TreeSelect` — 26 files — and it is a WCAG 2.1.1 failure on every one. **Deferred to Phase 81 by user decision, 2026-09-14.** Four remedies were priced (a combobox-only portal target, `withinPortal: false`, defaulting the app to `shadow` mode, or waiting); the user chose to wait rather than re-plumb Mantine portals that P81 deletes anyway. The consequence is on the record: **every dropdown in the product stays keyboard-inoperable until P81-B migrates the select family.** The workaround for anyone testing in the meantime is `?portal=shadow`. It is also the binding constraint on P80-B: Base UI's parts use ID-referenced ARIA the same way, so the select family must keep its listbox in the trigger's root. |
| ~~**ID-based ARIA cannot cross the overlay-root boundary**~~ (superseded by the row above) | **P80-B blocker.** Found in the P80-A manual pass, 2026-09-14. The default portal mode is `overlay-root`, so a Mantine `Select`'s dropdown renders in the overlay root's shadow root while its input stays in the gallery's: two different trees. `aria-activedescendant` and `aria-controls` are **ID references**, and an ID reference cannot resolve across a shadow boundary. Reported symptoms on the Typography panel's Font and Theme selects: NVDA announces "blank" on every arrow key, typing filters the list but no option can be chosen, and the arrow keys move the text caret instead of the highlight. The shadow-boundary cause is a strong hypothesis and is **not yet confirmed**; the decisive test is `?portal=shadow`, **not** `?portal=document`: `document` mode sets the portal target to null so Mantine falls back to `document.body`, which is still outside the gallery's shadow root, and only `shadow` mode keeps the dropdown in the trigger's own tree. `?portal=document` was tried on 2026-09-14 and changed nothing, which is consistent with the hypothesis rather than against it. Measured separately: a bare Mantine `Select`, searchable and not, passes the full keyboard contract under the app's own test providers in jsdom (options open, `aria-activedescendant` is set on ArrowDown, Enter selects), so the component is not generically broken and the cause is environmental. This is the same class as the `aria-owns` finding below, so **Base UI will hit it too**: P80-B's select family must either keep the listbox in the trigger's own tree or avoid ID-referenced ARIA. Confirm before building, not after. |
| **Filled-and-flush controls have no working ring geometry** | P81-B / layout. Enumerated by the designer on the live Admin Panel: `Add Media` (solid fill, **0px clearance**, inset pair measures 2.91 and fails 3:1), `Rescan Types` (0px clearance) and the Media sort mode (3px). The outset ring is clipped by the container and the inset variant does not clear on a solid fill, so **neither geometry works**. The adopted rule: filled controls take the outset ring and must be given at least 6px of clearance, since the outset halo meets the surface rather than the fill; flush controls on neutral or washed grounds take the inset ring; **filled *and* flush is a layout defect rather than a ring variant**. These three are layout tickets. |
| **`aria-owns` across a shadow boundary** | Base UI points `aria-owns` at an id in another shadow root for iOS VoiceControl, which axe reports as `aria-valid-attr-value` at critical impact and which cannot resolve in the accessibility tree. Worth confirming in P80-B against a real screen reader before deciding whether it needs a workaround. **Partly answered 2026-09-14 by the select family**, which does not reproduce it: its popup stays in the trigger's root, so the id resolves and the scoped axe gate on an open listbox reports no critical or serious violation. It is still open for the P80-A overlays, which do portal out, and the question there is whether they should follow the select family's container rule. |
| **The elevation ladder has at most two usable rungs on every theme** | P80-B, measured 2026-09-14 while building the segmented indicator, and **with the designer**. `surfaceRaised` is identical to `surface2` on **21 of 23** bundled themes (deltaE00 0.00, ratio 1.00); on the two exceptions, default-light and default-dark, the gap that closes instead is `surface` to `surface2` (0.75 and 1.61). So no bundled theme has three distinguishable surface rungs. This is not a component defect and it is not fixable in one: it decides what any raised or recessed surface can look like across the framework, and several components currently hold themselves together with a border doing an elevation's job. The segmented indicator is the first to do so deliberately, with `border-strong`, which clears 3:1 on all 23. Sent as `elevation-and-selected-rows-2026-09-14.md`. |
| **The colour picker's surface has no manual pass yet** | P80-B, 2026-09-14. It is the framework's only two-dimensional control and the only one whose keyboard path is a text field rather than the control itself. The unit and browser suites cover the arithmetic, the pointer, the arrow keys and the announced value, and none of them can say whether a screen-reader user can actually set a colour with it. That belongs in §6B of the manual audit beside the overlays, and it is the one component where the manual pass could change the design rather than confirm it. |
| **Should the overlays keep portalling out?** | P80-B, opened 2026-09-14 by the select family's container rule. The overlays go to the provider's overlay-root container and the select family deliberately does not, so the framework now has two answers to one question. It is not a defect: a modal has no ID-referenced wiring between trigger and popup, and leaving the tree is what buys it the hostile-host guarantee. But the select family's hostile-host probe passes without leaving, which weakens the case for the split. Worth settling before P80-C adds a third popup, not during it. |
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

### P80-A, inset ring variant and the tab bar (2026-09-14)

**Status: landed, one part unverified in a browser.** The designer's inset ring variant, the menu row moved onto it, and the three tab-bar changes.

**The inset variant.** `[data-mullion-focus="inset"]` in [`focus.css`](../src/ui/styles/focus.css), spread as `focusableInset` from `@/ui/components`. Same two tones and the same three 2px bands as the outset ring, drawn inward, so it cannot be clipped by an ancestor and needs nothing from the container. Menu rows take it: a row is flush with the menu's content edge inside `overflow: auto`, so the outset ring lost 5px of its 6px on each inline edge. Proved in Chromium by reading the painted box (`data-mullion-focus`, `outline: none`, three `inset` bands, and the row's actual 1px of room), which is the form this batch got wrong once already.

**One deviation from the designer's snippet, deliberately.** They spelled the bands core, halo, core. The outset ring read outward is halo, core, halo, so the inset variant mirrors that instead: same tones, same widths, and a neutral rather than the core against the neighbouring row, which is the job the outermost band does in both. Recorded for them rather than asked, because it is the reading their own "it reads as the same indicator" asks for.

**Gated by standing rule 8.** Neutral and washed grounds only. On a solid role fill the pair falls under 3:1 on 33 of 138 theme-role pairs, so a filled control keeps the outset ring and is given clearance; filled *and* flush is a layout defect.

**The tab bar, all three changes, and two traps on the way.** Mantine already draws the active underline, so the work was smaller than the options sheet implied. The list had no class to target, so the adapter now maps one. And `styles.tab.fontWeight` is an **inline** style that outranks `chrome-portable.scss` entirely: a sheet rule setting `font-weight` on the active tab would never have painted, which is the P77-C defect reintroduced in the same file whose comment warns about it. Weight travels as `--mullion-tabs-tab-weight` instead, exactly as the colours do.

**Not browser-verified.** The tab bar lives behind the Admin Panel, which needs a signed-in session, so these three changes typecheck and lint but have not been measured in a browser. They are constructed on the pattern the tab colours already use rather than on a measurement, and they should be confirmed on the dev site before this row is called done.

**Still clipped and not fixed here.** `Show Title` and `Show Subtitle` in the Typography panel are Mantine `Switch` controls inside a `Popover` with a `backdrop-filter`. The framework's inset variant does not reach them, because it keys on an attribute only framework components stamp. Diagnosing them needs a measurement on a surface no test can reach, and the durable fix is P81-B migrating them onto the framework. Recorded rather than guessed at.

### P80-A, the rail and the role glyphs (2026-09-14)

**Status: landed.** The last two items the designer specified.

**The rail replaces the menu's highlight tint outright.** `data-highlighted` no longer moves the row's ground; a 3px leading rail in `primary-stroke` marks it instead, on pointer and on keyboard alike. The designer's case, and it is the right one: it closes the class of defect rather than narrowing it. No ground in the menu moves, so nothing painted on a row can be measured against a ground it was not audited on, which is the failure mode that cost three rounds of correspondence. It also collapses two conditions back to none: the tint had grown a `:not([data-mullion-tone])` because a toned label fell below AA on 22 of 23 themes, and a `:not(:focus-visible)` because the ring fell below 3:1 on three. The guard is now the stronger property rather than the two exclusions: **no rule may tint a highlighted row's ground at all**, proved by a mutation that re-adds one.

The tint it replaced measured 1.17 to 1.28:1 against the untinted row on every theme, which is why findability was the designer's argument rather than compliance. Stepping the row down the elevation ladder instead was measured by them and rejected: `surfaceRaised` to `surface` is 1.23:1 on default-dark and 1.05:1 on default-light, so no ground change is a strong signal on these palettes. `primary-stroke` needed no new audit, being the ring's own core.

On a keyboard move a row carries the rail and the inset ring together, which is deliberate: two states, two marks. They overlap at the leading edge and are both drawn in `primary-stroke`, so it reads as the ring with a heavier leading edge rather than as two indicators fighting. Verified in a browser by reading the row's computed background before and after highlighting (unchanged) and the `::before` rail's painted width and colour.

**The role glyphs close the colour-vision gap.** [`roleGlyph.tsx`](../src/ui/components/roleGlyph.tsx) carries the designer's four, delivered in `docs/design/glyphs/`: a stroked check, a filled triangle with a bang, a stroked cross, a filled disc with an i. `Alert`, `Button` and `Badge` supply the glyph for a status tone by default; an explicit icon wins and `false` declines it, so a label that already names its role opts out on purpose rather than by omission.

**`Badge` gained an icon slot, and that was the point.** It had none, which is why `tone="success"` reading "Tier 2" was a legal call conveying its meaning by colour alone — and on the light palette under protanopia that badge is `deltaE00` **0.00** from a warning one. The designer measured the same pairs at full chroma and found 2.7 to 8.8 under CVD, so no ink escapes it: a role-coloured rail or border would be a signal measuring 2.7 instead of 0.00, and neither is a signal. Only shape and words survive.

**The differing silhouettes are the requirement, not a detail**, since four variations on a disc would measure identically and signal nothing. That is a test: the four `d` attributes must be four distinct values, and swapping one for another fails it. The glyphs paint in `currentColor` and are `aria-hidden`, so they take the tone their element already declares and never become the accessible name; that pairing is the one `washIconChecks` audits at the 3:1 non-text floor.

**Scoped as the designer specified: `light` controls.** A `filled` control carries the role at full chroma, where the same CVD collapse is weaker but real (2.7 at worst). Left as it is rather than widened unilaterally, and noted for them.

### P80-C, the notification and confirmation managers (2026-09-14)

**Status: landed, and Phase 80 with it.** `notify` and `<Notifications />` in [`notification.tsx`](../src/ui/components/notification.tsx) with [`notification.css`](../src/ui/components/notification.css), on Base UI's `toast`; `confirm()` and `<Confirmations />` in [`confirm.tsx`](../src/ui/components/confirm.tsx), on the framework's own `Modal`. 32 unit tests, 13 browser tests, six new gate tests and a Storybook story. Five mutations were applied and caught, and a sixth was applied, **not** caught, and is recorded below.

**The track's stated counts were all wrong, and the phase contradicted itself.** The Problem paragraph says 48 `show` calls in 21 files and 8 `openConfirmModal`; Key Decision E says 11 confirm sites. Measured: 42 production `show` calls in 16 files, and 6 production confirm sites. Two of the four methods the acceptance criteria name, `update` and `clean`, have no production caller at all. They are still implemented, because a store missing them is a store the migration has to work around, but nothing in this codebase exercises them outside the tests written here.

**The finding that the acceptance criteria would have missed.** "The existing untranslated-notification gate still passes" is satisfied trivially and means nothing: [`no-untranslated-notification.js`](../eslint-rules/no-untranslated-notification.js) matches on *callee names* (`notifications.show`, `modals.openConfirmModal`), so `notify.show` and `confirm` matched nothing. The gate would have stayed green through the whole of Phase 81 while the 48 call sites it guards moved out from under it, and the suite would have reported success. The rule now matches both stores, six gate tests cover the new shapes, and reverting the rule while keeping the tests fails three of them.

**A live defect, found by enumerating the call sites rather than trusting the list.** [`useBroadcastStaleness.ts`](../src/hooks/useBroadcastStaleness.ts) raises its "Template updated in another tab" warning with `autoClose: 0`. Mantine's `getAutoClose` returns early for any numeric value, so that schedules `setTimeout(hide, 0)` and the warning dismisses itself on the next tick. The message tells the user to close and reopen the tab, so the intent was plainly `false`. It is filed rather than fixed here: Key Decision B says this phase migrates no consumers. Under `notify` both spellings mean "keep it up", so the migration fixes it rather than carrying it across.

**Three decisions about the visual, each forced by a measurement someone else took.**

1. *A column, not a deck.* Base UI supports the collapsed-stack presentation through `--toast-index` and `--toast-offset-y`, and it was rejected. Mantine stacks notifications in a column and the migration's job is that 42 call sites keep behaving as they do; a deck would also put the second toast behind the first at partial opacity, which is a contrast measurement nobody has taken.
2. *A border, not an elevation.* A toast floats above arbitrary page content and the token ladder cannot express that: `surfaceRaised` is ΔE00 **0.00** from `surface2` on 21 of the 23 shipped themes. This is the same workaround the segmented indicator uses and the same finding already filed with the designer in `elevation-and-selected-rows-2026-09-14.md`. It is a workaround, not a treatment.
3. *The tone paints the leading edge, not the ground.* A washed ground would put four status colours ΔE00 0.00 apart under protanopia on the light palette, which is the measurement the role glyphs exist for. The glyph carries the meaning; the rail is the redundant cue beside it.

**Two things the stores do that the primitive does not, and why.**

*A pre-mount buffer.* `createToastManager` emits to whoever is subscribed at the time and holds nothing, so a `notify.show()` raised during app boot is dropped in silence. Mantine's store holds it and renders it when the container appears. "The error notification sometimes does not appear" is the worst class of regression a migration can introduce, so both stores buffer until a host mounts.

*Confirmations are a queue, not a stack.* Two sibling modal dialogs each mark the other's portal `aria-hidden` on Base UI's behalf, and the measured result is that **neither** is exposed to assistive technology. It only happens when both open in the same commit: opened a commit apart, the topmost is correctly exposed, which is the realistic path (a confirm raised from inside an open modal, as `LayoutBuilderModal` does, works correctly). Rendering one at a time removes the arrangement entirely, and a queue is the better reading of a confirmation anyway. The underlying `Modal` behaviour is P80-A's and is in the follow-on table rather than patched from here.

**One semantic that diverges from Mantine, deliberately.** `notifications.show` with an id already on screen is a no-op; `notify.show` updates that toast in place and restarts its timer. The only call site that passes an id is `App.tsx`'s idle-timeout warning, and `useIdleTimeout` fires `onWarning` once per idle cycle from a single timer rather than on a countdown, so nothing in this codebase can tell the two apart. Upserting is the less surprising behaviour of the two: silently dropping a notification is how a stale message survives on screen.

**Base UI names its own live region in English.** The toast viewport defaults to `aria-label="Notifications"`, which would be the single untranslated string in a framework whose whole argument is that chrome is translatable. `<Notifications label>` is required rather than optional for that reason, and both suites assert the supplied name reaches the element.

**An API trap worth naming, because it cost a browser run.** `Modal`'s `size` is typed `UiSpacing`, so `size="md"` compiles, reads as a sensible width and resolves to the ~16px *spacing* token. The confirm dialog rendered 16px wide, its buttons overflowed onto the backdrop, and the failure surfaced as "the backdrop intercepts pointer events" rather than as a sizing error. `UiConfirmOptions.size` is deliberately a CSS length and not a scale step.

**A flaky P80-B guard, fixed here rather than rerun until green.** The full suite failed once on `the segmented control's indicator sits over the checked segment and follows it`, a P80-B test this track did not touch. Repeated in isolation it failed roughly one run in five, reading 1.8px and 3.5px against a 1px tolerance. The cause is in the test, not the component: the indicator transitions `translate` and `inline-size` as two separate transitions on one element, and the settle-poll watched only the offset, so it released while the width was still animating and the width assertion read the animation. It now settles on the worse of the two axes. Eight consecutive runs pass where four of five did before. Widening the tolerance would have hidden it, and a gate that fails one run in five trains people to rerun rather than read.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| the i18n gate covers the new call shapes | the rule reverted to matching `notifications`/`modals` only | three gate tests fail |
| a toast raised before the viewport mounts still appears | the pre-mount buffer removed | the buffer test fails |
| `autoClose: false` keeps the toast up | `false` mapped to the provider default instead of the never-dismiss value | the persistence test fails |
| a role tone carries its glyph | the glyph forced off | the glyph test fails |
| a palette name maps to the audited role | `green` remapped to `info` | the mapping test fails |
| a limited toast is hidden, not merely transparent | `visibility: hidden` dropped, leaving `opacity: 0` | the browser test fails |

**One mutation was applied and not caught, which is the P80-B lesson repeating.** Passing `autoClose: 0` straight through instead of clamping it changed nothing, because Base UI already reads `0` as "never dismiss" and the clamp only ever mattered for a negative value nobody passes. The test that covers it is still worth having: it pins the *contract* regardless of which layer supplies it. But the clamp is defensive rather than load-bearing, and claiming the test proved it would have been false. The replacement mutation above exercises the mapping that actually does the work.

### P80-B, pagination and the colour picker (2026-09-14)

**Status: landed, and P80-B with it.** `Pagination` in [`pagination.tsx`](../src/ui/components/pagination.tsx), `ColorPicker` and `ColorInput` in [`color.tsx`](../src/ui/components/color.tsx). 34 unit tests, 5 more browser tests and a Storybook story. These are Key Decision D's two remaining gaps: Base UI ships neither, so both are ours in full and both are reviewed as behaviour.

**Pagination was the cheap one, as P78-B priced it.** A list of buttons and the arithmetic that decides which numbers to show. The part worth writing down is what libraries usually miss: a named `nav` landmark, `aria-current` on the current page, and a name on every control, because a screen reader reading "button 3" with no context has told the user nothing. Each button is its own tab stop, which is the Authoring Practices' treatment of pagination as a set of links rather than a composite widget, and so roving focus would be wrong here in the way it is right for a tab bar.

The one real decision is that **the range keeps a constant width as the current page moves.** A range that grows and shrinks makes the control reflow under the pointer between clicks, so the next number is not where the user aimed. `paginationRange` is exported for that reason and the property is asserted over all 20 positions of a 20-page range, and again in a browser against the rendered width.

**The colour picker: what is ours and what is not.** Three things are ours and each is named as behavioural code: the saturation-and-value surface, the colour arithmetic, and the parsing of whatever a caller has stored. Everything with an established keyboard contract stays the primitive's, which is principle 6 paying off rather than being argued for: the hue and opacity rails are the framework's own `Slider`, so they arrive with arrows, Home, End and the page keys instead of a second implementation of them.

**The keyboard path is the text field, not the surface.** A two-dimensional gradient has no ARIA pattern that expresses it, so the field accepts and reports the value in the caller's own format and is what a keyboard or a screen reader uses. The surface is an enhancement on top: it takes focus and arrow keys, and it reports its position through `aria-valuetext` **in words**, because there is no honest `aria-valuenow` for a point in a plane. Claiming one would be worse than saying nothing.

**Three decisions the arithmetic forced.**

1. *A value that is not a colour stays null.* The empty string and `transparent` are both real stored values in this product's gradient stops, and coercing either into black would silently rewrite saved data. `transparent` parses to alpha zero; everything unrecognised parses to null and is left alone.
2. *A half-typed value is left alone.* Rewriting someone's `#ff` into `#ffffff` under the cursor is the defect every colour field starts with, so the field holds the text and only the picker writes a formatted value.
3. *The hue is remembered separately.* Black and white carry no hue, so a parsed value cannot report one; without a memory the surface snaps back to red the moment a caller drags the brightness to zero, and the next drag starts from the wrong place. It is held in state rather than a ref, because reading a ref during render is the concurrent-rendering hazard the lint rule exists for, and the first draft did exactly that.

**One exemption to a standing rule, granted narrowly and pinned.** `color.css` is the only framework sheet allowed a colour literal. A hue rail that is not the spectrum lies about what it selects, and a transparency checkerboard that takes a theme's colours stops reading as "what is behind shows through" and starts reading as a colour; neither is a theme's decision to make. The exemption is pinned to the twelve literals it was granted for, so it cannot quietly widen into "colours are fine in this file", and adding a thirteenth fails the test.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| an unrecognised value is not a colour | `parseColor` made to return black for empty input | three tests fail |
| the hue survives a colour that cannot carry it | the hue memory removed | the greyscale test fails |
| the page range keeps its width | one branch of `paginationRange` shortened | the constant-width test fails |
| the colour-literal exemption stays narrow | a `#336699` added to the exempt sheet | the pinned-literals test fails |

### P80-B, the choice controls (2026-09-14)

**Status: landed.** `Checkbox`, `Switch` and `Slider` in [`toggle.tsx`](../src/ui/components/toggle.tsx) with [`toggle.css`](../src/ui/components/toggle.css), and `Chip.Group` beside the existing `Chip` in [`control.tsx`](../src/ui/components/control.tsx). 25 unit tests, 3 more browser tests and a Storybook story. **Pagination and the colour picker are what is left of P80-B.**

**`onChange` hands over the value, not the event, and that is a migration cost taken on purpose.** The 76 `Switch` and 11 `Checkbox` call sites read `event.currentTarget.checked` today, so every one changes in P81. It is taken because `Chip` has handed a boolean since P79-C and these are the same kind of control, and because a site left unconverted **does not compile**: a `boolean` has no `currentTarget`. The input family kept the event shape for a different reason, which still holds: its call sites were already split between the two shapes, so normalising there would have been a change with no single right answer.

**`Chip.Group` is ours, and the reason is the markup.** A chip is already a real `<input>` inside a `<label>`, so the group only has to say which input type to render and hold the value. Under `multiple={false}` the chips become **radios**, which is what gives the group its arrow keys and its single tab stop from the platform rather than from code here; under `multiple` they stay checkboxes. Wrapping Base UI's `RadioGroup` would have meant replacing the chip's own element to gain behaviour the platform already provides. A lone chip is untouched from P79-C, and there is a test that says so.

**Three defects found by the tests, all mine.**

1. *The slider had no accessible name.* Base UI renders the root as a `role="group"` and the control itself as a visually hidden `<input type="range">` inside the thumb, so `aria-label` on the root named the group and left the slider unnamed. This is the same shape as P80-A's `NumberInput` defect and it surfaced the same way, by a test failing to find the control by name. The label goes on the thumb.
2. *The value bubble failed an axe contrast check on text nobody can see.* An element at `opacity: 0` is still rendered as far as axe is concerned: it composited the bubble against the page ground and reported **1.01:1**. `visibility: hidden` removes it from that calculation and from the accessibility tree, and it is the honest fix rather than a suppression, because the element genuinely is not shown.
3. *A `:focus-visible` selector on the thumb matched nothing,* because the focus target is the hidden input inside it, and Base UI's `data-focused` is a `Field` state a standalone slider never receives. `:has(:focus-visible)` is what works, and the test names both dead ends so the next person does not retry them.

**One finding that is not about these components.** A transitioned property animates once from its initial value when the component sheet is adopted, because that happens after the element's first resolved style. Ungated, the tab indicator and the segmented indicator both slid in from the left edge on every page load, and the slider's bubble faded out on every load; the segmented one was caught mid-animation by a browser test reading **27px wide and 2px short of its segment**. Both indicators now gate their transition on a `data-ready` attribute that arrives a frame after mount, through one shared hook, and the bubble has no transition at all. **Any framework component that transitions a property has this, and it is worth remembering before the next one adds one.**

**A four-pixel indicator gap, and the cause is worth keeping.** The segmented indicator was positioned from `offsetLeft` and `offsetWidth`, which round to whole pixels: a segment 50.45px wide got a 50px indicator. It now measures the same border box it draws, through `getBoundingClientRect`, with `box-sizing: border-box` on the indicator so the two agree, and the offset taken along the inline axis so it holds in either direction. The browser test's tolerance went from 3px to 1px, which is what made the remaining error visible.

**A standing guard against a defect this phase has now shipped twice.** P80-A's first overlay sheet read four `--mullion-*` names the engine does not emit; this batch's first draft read two more (`--mullion-color-primary-fill`, `--mullion-primary-on-fill`, which are really `--mullion-color-primary` and `--mullion-color-primary-on`). Both times the only thing that caught it was someone enumerating the emitter's output by hand. That step is now rule 4 in [`componentSheets.test.ts`](../src/ui/__tests__/componentSheets.test.ts): every `var(--mullion-*)` in every framework sheet must be a name the engine emits or one a sheet or component sets itself, the second class read out of the TSX because most of them are set inline through `customProperties`. Putting either invented name back fails it.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| the slider names its control | `aria-label` moved from the thumb back to the root | two tests fail, including the axe gate |
| the checked state keys on an attribute the primitive writes | `[data-checked]` renamed to `[data-on]` on the switch | the generalised P77-C test fails |
| a single-choice chip group renders radios | the input type forced to `checkbox` | three tests fail |
| no sheet reads a name nothing emits | `--mullion-color-primary` put back to `--mullion-color-primary-fill` | the new rule-4 test fails, naming the file and the token |

### P80-B, tabs, the segmented control and the accordion (2026-09-14)

**Status: landed.** `Tabs` and `SegmentedControl` in [`tabs.tsx`](../src/ui/components/tabs.tsx) with [`tabs.css`](../src/ui/components/tabs.css), `Accordion` in [`accordion.tsx`](../src/ui/components/accordion.tsx) with [`accordion.css`](../src/ui/components/accordion.css). 27 unit tests, 8 browser tests and a Storybook story. `Checkbox`, `Switch`, `Chip.Group`, `Slider`, pagination and the colour picker are what remain of P80-B.

**Three measurements decided three things, and two of them would have shipped invisible.**

| Question | Measured | Consequence |
|----------|----------|-------------|
| Can the segmented indicator be an elevation step? | `surfaceRaised` is **identical** to `surface2` on **21 of 23** bundled themes (deltaE00 0.00, ratio 1.00) | No. The indicator carries a 1px `border-strong` border, which clears 3:1 on all 23 by construction because the engine audits that pair. |
| Does the tab bar need a measurement of its own? | Base UI's `Tabs.Indicator` publishes the active tab's box as `--active-tab-left` and `--active-tab-width` | No. The plan expected that code to be ours; it is the primitive's, and only the segmented control needed a measurement written. |
| Does the indicator sit still on mount? | In Chromium it read 27px wide and 2px short of the segment, sliding in from the left edge | The transition is gated on a `data-ready` attribute that arrives a frame after the first measurement. |

**The P77-C defect was reproduced in this batch and caught by the browser suite.** The active-tab rule was written as `.mullion-tabs-tab[data-selected]` and Base UI writes **`data-active`**, so the rule never matched: the same class of defect as P77-C's three dead rules, in the same component. The unit test that should have caught it only grepped the sheet for the token, which is precisely the weak form P77-C's post-mortem warned about. It is now the guard written for the select family, generalised over all three components: the attribute name is read **out of the sheet** and the rendered element is asserted to carry it, so renaming either half fails. Putting `data-selected` back fails it.

**Manual tab activation, and it is a deliberate change.** Base UI's `activateOnFocus` defaults to false: arrow keys move focus and Enter or Space selects. Mantine activates on focus, which is what the product does today. The default is kept because the Authoring Practices ask for manual activation when a panel is expensive to show, and the Admin Panel's seven tabs each load their own data, so arrowing from Campaigns to Analytics would mount every panel on the way. It also removes the confusion P80-A recorded on the live bar, where focus and selection moved together and the focus ring read as a selection mark. `activateOnFocus` is exposed for a bar that wants the old behaviour.

**The accordion has no arrow-key navigation, and that is current rather than missing.** Roving focus was removed from the accordion pattern by the Authoring Practices in w3c/aria-practices#3434, and Base UI followed: its `orientation` and `loopFocus` props are documented as deprecated no-ops. Each header is its own tab stop. This differs from what the product does today and it is the behaviour the guidance now asks for, so it is a recorded change rather than a regression, with a test that asserts an arrow key does **not** move between headers.

**A segmented control is a radio group.** That is the Authoring Practices pattern for picking one value and it is also what Mantine renders, so nothing about the announcement changes when the 27 call sites migrate. Base UI's `ToggleGroup` was the alternative and it gives `aria-pressed` buttons, which is a different thing to announce.

**The accordion control takes the OUTSET ring while a tab and a menu row take the inset one.** Not an inconsistency: a control is the full width of an item and the items sit in a gap, so the 6px the outset ring reaches is there to reach into. Standing rule 8 puts *flush* controls on the inset variant, and a tab is flush against a bar that may scroll. Both are measured in the browser.

**Two smaller defects found and fixed.** The segmented track is `inline-flex`, which a flex or grid parent still stretches across the cross axis, so it filled a column it was only meant to sit in (measured at 1104px in the showcase); it now takes `inline-size: fit-content`, and `fullWidth` remains the way to ask for the whole width. And the accordion panel is unmounted when closed rather than kept at zero height, which the first browser test asserted wrongly.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| the active state keys on an attribute the primitive writes | `[data-active]` renamed back to `[data-selected]` | the generalised P77-C test fails, naming the tab |
| the active tab's weight is a property, not a declaration | `--mullion-tabs-tab-weight: 600` replaced by `font-weight: 600` | two tests fail |
| the segmented indicator carries a border | `border: 1px solid var(--mullion-color-border-strong)` replaced by `border: 0` | the border test fails, citing the 21-of-23 measurement |
| the indicator does not animate into place on mount | `data-ready` set unconditionally | the mount test fails |
| reduced motion stills every transition | the accordion panel's reduced-motion rule given a 1ms transition | the reduced-motion test fails |

**Validation.** The showcase section is behind `?choice=1`, so the `ui-showcase` and `theme-qa` baselines render what they rendered before.

### P80-B, the select family (2026-09-14)

**Status: landed.** `Select`, `MultiSelect` and `TagsInput` in [`select.tsx`](../src/ui/components/select.tsx) with [`select.css`](../src/ui/components/select.css), on Base UI's `Select` and `Combobox`. 27 unit tests including a structural axe gate, 11 browser tests, and a Storybook story. The rest of P80-B (tabs, accordion, segmented control, the simple choice controls, pagination and the colour picker) is still Planned.

**The binding constraint is discharged, and it is discharged by measurement.** P80-A left this track one rule: the select family must keep its listbox in the trigger's own root, because ID-referenced ARIA cannot cross a shadow boundary and the shipped `overlay-root` portal mode puts popups in a second shadow root. That is the confirmed cause of every Mantine dropdown in the product being keyboard-inoperable. These components resolve their container from the trigger element instead: the nearest `[data-mullion-scope]` element when there is one, so a nested provider's tokens still reach the popup, and the root node otherwise, where the sheet is keyed on `:host`. `e2e/ui-selects.spec.ts` asserts the property in a browser on both mounts, against the shipped default: the popup and the trigger share a root, `aria-controls` resolves **in that root**, `aria-activedescendant` resolves after an ArrowDown on the searchable form, and the popup is **not** in the overlay root.

**Two primitives behind three components, because Base UI's two are not interchangeable.** A plain `Select` is Base UI's `Select`: a listbox with no input, which navigates by moving real DOM focus. `searchable`, `MultiSelect` and `TagsInput` are its `Combobox`, which renders an input and navigates with `aria-activedescendant`. Base UI's own guidance is to use `Select` when no input is rendered, and the ARIA genuinely differs, so picking one primitive for all four cases would have made three of them wrong. It also means the two navigation mechanisms are both exercised, and the virtual-focus one is precisely the mechanism the product's defect breaks.

**A selected option is marked by a check and by `primary-text`, never by a fill.** This is standing rule 8 applied rather than a preference, and the measurement is what settles it. A filled row inside a scrolling popup is flush with the popup's edge, which the rule calls a layout defect; and putting the highlight rail on such a row does not work at all, because the engine sets `primaryStroke` equal to `primaryFill` whenever the fill already clears 3:1. Measured over the 23 bundled themes: `primaryStroke` on `primaryFill` is **1.00:1 on ten of them** and clears 3:1 on **one** (darcula, 3.96), so a selected row could not carry the highlight mark. `primary-text` on `menu-bg` clears 4.5:1 on **all 23**, worst 4.54 (solarized-dark), and needs no new audit because `menu-bg` derives from `surfaceRaised`, one of the four grounds `textRung` already selects against. The check is the primary mark, so selection never rests on colour alone (1.4.1).

**The popup reuses the menu's vocabulary rather than inventing a second one.** Same `menu-bg` ground and `menu-bd` border, the same 3px leading rail in `primary-stroke` for `data-highlighted`, and the same inset focus ring. That keeps the property P80-A's rail bought: **no rule moves a row's ground anywhere in a popup**, so nothing painted on a row can be measured against a ground it was not audited on. Measured in Chromium on a keyboard move: the highlighted row's computed background equals the resting row's, the rail is 3px of a non-transparent colour, and the row's `box-shadow` carries the inset bands.

**Three defects found while building, and all three were mine.**

1. *`itemToStringLabel` was written against the wrong argument.* Base UI hands that function the **item**, not the value, so a lookup written as "find the option whose value is this" stringified every option as `[object Object]` and the filter matched nothing. Typing `georg` into the searchable field in a browser returned zero options. Base UI already stringifies a `{ value, label }` item by its label, so the correct fix was to delete the prop.
2. *A plain `items` array cannot resolve a value back to a label.* With the prop gone the filter worked and the input then showed `georgia` after picking Georgia, because without a `Combobox.createItems` collection the primitive can stringify an item for the filter but has no way back from a selected value to its label. The collection carries both directions and takes the flat or the grouped shape. Both directions are now unit-guarded.
3. *A test-harness polyfill was wrong in the direction of realism.* `Enter` on a select option committed nothing in jsdom. Base UI tells a keyboard activation from a mouse one by `detail === 0 && !pointerType`, and it synthesises the activation click as a constructed `PointerEvent`, whose `pointerType` is the empty string in a browser. The project's jsdom polyfill defaulted `pointerType` to `'mouse'`, so every synthesised keyboard click looked like a mouse click and the library's own guard against "the popup opened under the cursor" rejected it. The polyfill now defaults to the spec's empty string. It is recorded here because it is the same class as the traps already in `project_test_harness_traps`: a shim that is *almost* right hides real behaviour rather than revealing it.

**`Chip.Group` is not here and is not forgotten.** The four `Chip` call sites use Mantine's `Chip.Group` with `multiple={false}`, which P79-C's `Chip` (a styled checkbox) has no counterpart for. It belongs with the choice controls later in this track, beside `Checkbox` and `Switch`.

**The field shell is now shared, and that is not the coupling P76-D/H punished.** `FieldShell` moved out of `input.tsx` into [`field.tsx`](../src/ui/components/field.tsx) so the select family wears the same label, description and error block. What P76-D/H proved dangerous was Mantine rendering all six input *controls* through one `Input`, so a border change reached every one at once. The label block is the part every field genuinely has in common, and a copy per component would guarantee they drift apart on exactly the properties an audit names.

**Mutations.** Each applied alone against the guarding suite and restored byte-identically.

| Guard | Mutation applied | Result |
|-------|------------------|--------|
| the listbox does not go where the overlays go | `useListboxContainer` swapped for `useMullionPortal()` | the portal test fails, naming the overlay container |
| the selected-row rule keys on the attribute Base UI writes | `[data-selected]` renamed to `[data-checked]` in the sheet | two tests fail, including the one that reads the attribute name out of the sheet |
| no rule tints a highlighted row | a `background-color` added to the highlight rule | the no-tint test fails |
| a selected value resolves to its label | the collection replaced by a plain array | the searchable label test fails |

**One thing the unit suite cannot prove, said plainly.** Under a light mount every container is in the same document, so comparing root nodes there cannot tell the overlay container from the trigger's tree. The unit test that survives is the distinguishing one (the popup is not inside `useMullionPortal()`'s container), and the **root** property is proved in `e2e/ui-selects.spec.ts` across a real shadow boundary. An implementation that picked some other container in the right root would pass the unit suite and is caught only there.

**The hostile host holds.** A listbox cannot leave its tree the way an overlay can, so P77-B's probe is the case that had to be measured rather than argued: a transformed ancestor, the page scrolled 600px and a sticky header at `z-index` 9999. The popup keeps its box and `elementsFromPoint` reaches it at the top of the stack.

**Validation.** `npx tsc --noEmit` clean, `npm run lint` clean, `npm run ui:allowlist:check` green at 178 files, `npx vitest run` green (27 new tests in `src/ui/__tests__/select.test.tsx`), `npx playwright test e2e/ui-selects.spec.ts` 11 of 11. The select showcase is behind `?selects=1` for the same reason the overlays are behind `?overlays=1`, so the `ui-showcase` and `theme-qa` baselines render exactly what they rendered before.

### P80-A, the input family (2026-09-14)

**Status: landed.** `TextInput`, `Textarea`, `PasswordInput` and `NumberInput` in [`input.tsx`](../src/ui/components/input.tsx) with [`input.css`](../src/ui/components/input.css), on Base UI's `Field` and `NumberField`. 17 unit tests including a structural axe gate, and a Storybook story.

**The coupling is gone, which was the point.** Mantine renders all six of its input components through one `Input`, so the adapter's single entry reached every one at once, and that is why P76-D/H could collapse the borders everywhere in one change. Each component here composes the `Field` parts itself: a change to one reaches one.

**The border lives on the control row, not on the input.** That one decision is what makes the unit slot work. A unit, a stepper or a section sits *inside* the field's border, so it shares the border and the height by construction. `UnitScrubField` has to fake that today with a `variant="unstyled"` `Select` in a `rightSection`, three `height: 100%` overrides and a hand-computed `rightSectionWidth`, and the seam still shows while the field ends up taller than its neighbours. Nothing here computes a width; the separator is one border. That is the named blocker for P81-B's Typography panel redesign, and it is now cleared. A static string and a full control both land in the same slot, and both forms are tested, because the second is the one the Typography panel needs.

**Base UI's `ScrubArea` replaces hand-rolled pointer code.** `UnitScrubField` writes its own `onPointerDown`/`onPointerMove`/`setPointerCapture` scrubbing; `scrubbable` hands that to the primitive, which also brings cursor teleport and sensitivity. This is study principle 6 paying off rather than being argued for.

**`onChange` shapes differ on purpose.** `TextInput` hands over the event, `NumberInput` the value, because that is how their 80 and 136 call sites read them. Normalising one onto the other would make every migrated site wrong in a way that still compiles, which is the worst available outcome for a mechanical migration.

**One defect found by the tests, and it was mine.** Base UI's `NumberField` has **no `Label` part**, and the first draft rendered the label as a bare `span`: the control had no accessible name at all. A screen reader would have announced an unlabelled spin button. The unit tests could not find it by name either, which is how it surfaced. It now carries an explicit `id` with a real `<label for>` plus `aria-describedby` for the description and error, and the structural axe gate fails if the association is removed.

**`ColorInput` is deliberately not here.** Base UI ships no colour picker; P78-B recorded that gap when it picked the primitive and called it "the expensive one, a component in its own right". Its 25 call sites belong with P80-B's gap list beside pagination and tags input, not smuggled into this batch.

**Validation.** `npx tsc --noEmit` clean, `npm run lint` clean, `npm run ui:allowlist:check` green at 178 files, `npx vitest run` **4,233 of 4,233** across 272 files, `npx playwright test` **85 of 85** with no snapshot movement, `npm run build` clean. One `portal-mode` spec timed out on a cold start in the first run and passed on two subsequent runs, alone and in the full suite; recorded as flaky rather than dismissed as such.

## Outcome

_Reopened 2026-10-02. P80-A, P80-B and P80-C landed by 2026-09-14; P80-D, P80-E and P80-F were added to close the keyboard gate (redefined in Key Decision C) and to fix the framework follow-ons before Phase 81 builds on them. The section below describes the first three tracks and is updated when the rest land._

**What Phase 80 built.** Every `@mullion/ui` component that handles a keypress, plus the two imperative stores that raise chrome without one. Nothing was migrated onto them: Key Decision B holds, and Phase 81 owns the move.

**The four gates of Key Decision C, phase-wide.** Three of four, for every component in all three tracks. The axe structural gate, the P77-F ring walk and the P79-B static sheet rules are met and mutation-checked. **The manual keyboard pass in `ACCESSIBILITY_MANUAL_AUDIT.md` §6B has never been run.** *(Redefined 2026-10-02 as an automated suite plus a screen-reader pass; P80-D and P80-E close it.)* It is the same gap P80-A opened, P80-B inherited and P80-C now shares, and it is the one thing standing between this phase and a clean four-of-four.

**What the phase found that none of the three plans contained.** Each track surfaced at least one defect its own acceptance criteria could not have caught, and in two cases the criterion was satisfiable while the thing it was meant to protect was broken. P80-A shipped four invented token names; the answer was a standing rule rather than a fix. P80-B reproduced P77-C exactly, a sheet rule keyed on an attribute the primitive never writes, and the unit test that should have caught it was the weak form; it is now the strong form across five components. P80-C found that the i18n gate its criteria told it to keep green was keyed on callee names and would have gone blind the moment Phase 81 renamed them. The pattern is worth carrying into Phase 81: **a criterion phrased as "X still passes" is worth nothing unless someone checks that X still looks at the thing it was written for.**

**What P80-B built, and what it cost.** Twelve components across five batches: the select family, tabs, the segmented control, the accordion, the checkbox, switch, slider and chip group, and both gaps Base UI does not fill. Every one carries the four gates of Key Decision C except the fourth, which is the same outstanding item P80-A has: the manual keyboard pass in `ACCESSIBILITY_MANUAL_AUDIT.md` is written down and **not run**.

**The track's own acceptance criteria, against what was measured.**

| Criterion | Result |
|-----------|--------|
| A checked select option takes its colour from a token, and the rule survives a mutation of the attribute name | Met, and the guard is stronger than the criterion asks: the attribute name is read out of the sheet and the rendered element asserted to carry it, for the select, the tab, the segment, the checkbox and the switch. |
| Tabs and segmented control colours come from tokens with no inline colour on the part | Met. The active tab's weight travels as a custom property for the same reason, which is the half of P77-C that a colour-only check would miss. |
| Keyboard contracts verified per component against the Authoring Practices | Met in jsdom and in a browser, including the page keys on the slider and typeahead in the select. Two contracts deliberately differ from Mantine's and are recorded above. |
| The four gates, for every component | Three of four. The manual pass is the fourth and it is not run. |

**What the track found that was not in its plan.** Three defects of the same class, each caught by a different gate. The P77-C failure mode reappeared in the tab bar and was caught in a browser rather than by the unit test that should have caught it; that test is now the strong form. The invented-token failure mode from P80-A reappeared here and is now a standing rule in `componentSheets.test.ts` rather than a step someone remembers to do. And a transitioned property animating once when the component sheet is adopted affected three components before anyone noticed it, because each looked like a separate timing quirk.

**The binding constraint held.** P80-A left this track one rule: keep a listbox in its trigger's root. Every component that has a popup does, and a browser suite asserts it on both mounts against the shipped portal default. The product's own dropdowns are still broken until P81-B migrates them, which is the user's recorded decision and not this track's to reverse.

**What the overlay batch proved about the framework's design.** The phase's Rationale 2 put the overlays first so that a design problem would surface while the phase was still small enough to change direction. It did not surface one. The provider's portal container, the `render` convention, the focus attribute and the tone ladder all took Base UI's components without modification, and the one architectural claim the phase rests on holds in a browser: a popup opened from inside the gallery shadow root paints from the nearest provider's tokens, survives a transformed ancestor and a sticky header at `z-index` 9999, and returns focus across the shadow boundary to the trigger that opened it, which is the defect the product has today.

**What it changed about the plan.** Three things, each recorded above: the drawer is the dialog primitive rather than Base UI's own swipe sheet; the compound-or-flat decision is made per component from the call sites rather than uniformly; and `modal` is the primitive's three-valued option passed through rather than a two-valued remapping that measurement showed was lossy.

**The most useful thing it found is not in the overlays.** `menu-hover-bg` has been emitted as `inherit` on every theme since P78-C shipped it, because the emitter's injection blacklist rejects the `/` in chroma's modern `rgb(r g b / a)` form. Nothing caught it for two days because no framework component read the token. Turning it on then exposed a second, larger gap: the semantic text rungs were never selected against the ground a highlighted menu row paints, and 22 of 23 themes fail AA there. The first is fixed with a guard on the emitted CSS rather than on the derivation, which is the gap it lived in. The second is filed, because every repair is a decision the designer or the user owns.
