# Mullion — Manual Assistive-Technology (AT) Audit

**A living, follow-along QA script for the WCAG 2.1 AA criteria that automated tooling can't verify**
(keyboard operability, focus management, real screen-reader output, Shadow-DOM exposure, motion,
reflow). Automated coverage (theme-contrast gate, axe structural checks) is described in
[ACCESSIBILITY.md](ACCESSIBILITY.md) — this doc is the **human** half of the P62-H track.

> **Status:** living document — started 2026-07-11. We add surfaces/checks as coverage grows.
> Track progress in §8 (Coverage tracker) and log issues in §7. Nothing here blocks a launch on its
> own — WCAG AA is the project's quality bar (see [PHASE62_REPORT.md](../archive/phases/PHASE62_REPORT.md) P62-H).

---

## 0. Before you start: the gallery's CSS is not in the page

**The gallery mounts into a shadow root.** Sweeping `document.styleSheets` from the host page
finds none of the plugin's rules, so a rule you are looking for will appear to be missing when
it is in fact applied. This has caught a reviewer once already: during the 2026-09-11 focus-ring
review the auditor searched the host document for the two-tone ring rule, found only stock
Mantine outlines, and was one step from reporting the ring as undeployed.

This applies to the plugin's own mount (the dev site, or WordPress). It does **not** apply to
Storybook, which renders in the light DOM with no shadow root at all; see §6B.

Inspect inside the tree, not beside it:

```js
// the gallery's own styles
document.getElementById('root').shadowRoot.styleSheets
// portaled admin chrome (Drawer, Modal, Menu) since P77-I
document.querySelector('[data-mullion-overlay-root]').shadowRoot.styleSheets
```

DevTools element inspection and computed styles work normally; it is only document-level
queries that miss. See [STYLING_GUIDE.md](STYLING_GUIDE.md) §1 for which tree holds what.

**Coordinate-based automated clicks can miss content two shadow roots deep.** Found running
the P77-I manual pass (2026-09-11): a synthetic pointer click at the exact on-screen coordinates
of a button inside the overlay root (portaled chrome under the shipped default) sometimes hit
nothing, even though `getBoundingClientRect()` reported the right numbers and the element was
confirmed not to move on scroll (so it was not a real containing-block bug). A direct
`element.click()` always worked. If a click through an automation tool silently does nothing
two levels of shadow DOM down, prefer dispatching the click on the element itself over
coordinate-based input before concluding the app is broken.

---

## 1. How to use this doc

1. Pick a surface from §4–§6 and work top-to-bottom through its checks.
2. For each check, mark the result: **✅ pass** / **❌ fail** / **⚠️ partial** / **n/a**.
3. On a fail/partial, add a row to the **Issue log** (§7) — one row per distinct problem.
4. Update the **Coverage tracker** (§8) when you finish (or partially finish) a surface.
5. Re-run a surface after fixes land; keep the log's "Status" column current.

You do **not** need to be an accessibility expert. Each check tells you *what to do* and *what a pass
looks like*. When in doubt, log it as ⚠️ with a note and we'll triage.

---

## 2. Set up your test environment

### Screen readers (use at least one; two is better)

| OS | Screen reader | Best browser | Turn on/off |
|---|---|---|---|
| Windows | **NVDA** (free, from nvaccess.org) | Firefox (or Chrome) | Start: `Ctrl+Alt+N`. Quit: `NVDA+Q`, then `Enter` |
| macOS | **VoiceOver** (built in) | Safari | **⌘+F5** toggles it |

**Minimum screen-reader commands you'll need:**

- **NVDA**: see the next subsection. The keys depend on which mode NVDA is in, which is the usual
  reason a command "does nothing".
- **VoiceOver** (modifier `VO` = `Ctrl+Option`): `VO+→`/`VO+←` navigate · `VO+U` rotor (headings /
  landmarks / form controls / links) · `VO+Space` activate · `Ctrl+Option+Cmd+H` next heading.

### NVDA: setup and the two modes

*Rewritten 2026-10-25 against the NVDA user guide, after the earlier quick reference was found not to
do what it said.*

**Setup, once.**

- **The NVDA key is `Insert`** (either `Insert` or the numpad one). `CapsLock` works only if you
  turned it on, in the welcome dialog or under NVDA menu, Preferences, Settings, Keyboard. Below,
  `NVDA+X` means hold the NVDA key and press X.
- **`Ctrl+Alt+N` starts NVDA** only if the desktop shortcut was created at install. Otherwise start
  it from the Start menu. It does not quit NVDA; `NVDA+Q`, then `Enter`, does.
- **The NVDA menu** is `NVDA+N`. Open **Tools, Speech viewer** before you start: it shows every
  utterance as text, so you can copy what was said into the results table instead of transcribing
  from memory.
- **Check the keyboard layout** under Preferences, Settings, Keyboard. A few commands differ: "read
  from here" is `NVDA+Down` on the Desktop layout and `NVDA+A` on the Laptop layout.

**The two modes.** Most confusion comes from here.

- **Browse mode** is for reading a page. The arrow keys move NVDA's own reading cursor, and single
  letters jump between elements: `H` heading, `D` landmark, `F` form field, `B` button, `K` link,
  with `Shift` to go back. `NVDA+F7` lists the page's headings, links, landmarks and fields.
- **Focus mode** is for operating a control. Keys go to the page, so the arrows move inside a menu
  or listbox and **the single letters type text or do nothing**. NVDA switches to focus mode on its
  own when you Tab onto a text field, combobox or menu, and plays a short tone when it does.
- **`NVDA+Space` toggles** between the two. **`Escape` leaves focus mode** if NVDA entered it on its
  own, so the first `Escape` inside a menu or dialog may be taken by NVDA and only switch modes. If
  `Escape` did not close the popup, press it again. To be certain a key reaches the page, press
  `NVDA+F2` first: it passes the next key straight through.

So: **Tab and Shift+Tab** are the test of keyboard order, and work in either mode. **The single
letters** are for exploring what a screen reader exposes, and work only in browse mode. If a letter
key types or does nothing, press `NVDA+Space` first.

### Keyboard-only basics (used everywhere)

`Tab` / `Shift+Tab` move focus · `Enter` activate buttons/links · `Space` activate buttons, toggle
checkboxes · `Esc` close/cancel · `Arrow keys` within composite widgets (menus, tabs, sliders,
segmented controls, radios) · `Home`/`End` first/last.

### Visual tooling

- **Zoom:** `Ctrl/⌘ +` to 200% (WCAG 1.4.4 / 1.4.10).
- **Reflow at 320px:** browser DevTools → device toolbar → set width **320px**.
- **Reduced motion:** OS setting (*Reduce motion*), or Chrome DevTools → **Rendering** → "Emulate CSS
  `prefers-reduced-motion: reduce`".
- **Focus visibility:** just watch for a clear focus ring as you `Tab`.

### Launching the app (real render required — not Storybook)

- **Full WordPress context:** `npx wp-env start`, then log into `http://localhost:8888/wp-admin`
  (admin surfaces) and put `[mullion-gallery campaign="<slug>"]` on a page for the public embed. See
  `docs/testing/TESTING_QUICKSTART.md`.
- **Shadow-DOM toggle:** the public gallery mounts in an **open shadow root** by default; append
  **`?shadow=0`** to the page URL to render without shadow DOM (compare AT behaviour with/without).
- **Themes:** switch the active theme in Settings; spot-check a **light**, a **dark**, and the
  **high-contrast** theme. Token contrast is already AA-gated, so focus manual contrast checks on
  component *states* (hover/disabled/selected) and any imagery.

---

## 3. Global / cross-cutting checks (run once per session, on any surface)

| # | Check (WCAG) | How | Pass looks like | Result |
|---|---|---|---|---|
| G1 | **Focus visible** (2.4.7) | `Tab` through the whole surface | Every focusable control shows a clear, high-contrast focus ring; focus never "disappears" | Yes |
| G2 | **No keyboard trap** (2.1.2) | `Tab` forward through everything, then `Shift+Tab` back out | Focus can always move on and escape any widget/modal (via Tab or Esc) | yes |
| G3 | **Focus order** (2.4.3) | `Tab` slowly, watch the order | Order follows the visual/reading order; no wild jumps | yes |
| G4 | **Zoom 200%** (1.4.4) | `Ctrl/⌘ +` to 200% | No clipped text, no overlap, all controls usable | good |
| G5 | **Reflow 320px** (1.4.10) | DevTools width 320px | No horizontal scroll for content; nothing lost or unusable | |
| G6 | **Reduced motion** (2.3.3) | Enable *reduce motion*, reload | Carousel autoplay, entrance/scroll-reveal, tilt/glow, and builder transitions are stilled or greatly reduced | yeah looks like it |
| G7 | **Non-text contrast** (1.4.11) | Eyeball focus rings, icons, input borders | Focus indicators and meaningful icons/borders have ≥3:1 against their background | looks like it |
| G8 | **`outline:none` audit** | Cross-check the 8 `outline:none` spots (see [ACCESSIBILITY.md](ACCESSIBILITY.md) §2) | Each has a visible `:focus-visible` replacement — none removes focus indication outright | the document doesn't list what they are, and it's not clear what we're checking here. Can't this part be automated anyway? |

NOTE: With the NVDA piece, list items spoken would be doubled, confirmed in the speech viewer as 2 entries for the same list item.  It comes out as the first word repeated and the rest of the list sentence spoken normally (as if the first speaking of it were cut off by the repetition), at least with NVDA.  Not sure if this is an issue of our setup, or a behavior flaw of NVDA.

---

> **2026-10-25: the audit stops here until the product is essentially complete.** Section 3 was
> run on 2026-10-25 (results above). Phases 81 and 82 change most of what sections 4 to 6B test,
> so the rest, including the §6B.3 screen-reader pass, moves to Phase 83's track P83-G. That
> track first automates nearly every remaining check and rewrites this doc to say which test
> covers each, leaving only the speech checks for a person. Test content for the pass:
> `scripts/seed-a11y-fixtures.php` (usage in its header). The findings so far are in Phase 81's
> track P81-E.

## 4. Public surfaces

### 4A. Gallery listing page (campaign cards)

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| P-L1 | Keyboard reach | `Tab` from page top | Every card / control is reachable and activatable with keyboard | yes |
| P-L2 | Card semantics (1.3.1, 4.1.2) | Screen-reader through a card | Card announces a meaningful name (campaign title); it's a link/button, not a bare div | |
| P-L3 | Images (1.1.1) | SR over thumbnails | Decorative images are silent; meaningful images have alt text | |
| P-L4 | Headings (1.3.1, 2.4.6) | NVDA `H` / VO rotor | A sensible heading structure exists (no skipped levels for the visible hierarchy) | |
| P-L5 | Pagination / load-more | Keyboard activate | "Load more" / pagination is reachable, operable, and announces new content (see 4.1.3) | |

### 4B. Lightbox / media viewer

The lightbox renders as `role="dialog"` labelled **"Media lightbox"**, with an `aria-live` position
counter (added in P54-C).

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| P-B1 | Open + focus move (2.4.3) | Open the lightbox via keyboard | Focus moves into the dialog on open | |
| P-B2 | Focus trap (2.1.2) | `Tab` repeatedly | Focus cycles **within** the lightbox; doesn't leak to the page behind | |
| P-B3 | Close + focus return | Press `Esc` and the close button | Both close it; focus returns to the element that opened it | |
| P-B4 | Dialog name (4.1.2) | SR on open | Announced as a dialog named "Media lightbox" | |
| P-B5 | Position announced (4.1.3) | Arrow to next/prev image | The "N of M" counter is announced via `aria-live` on change | |
| P-B6 | Arrow navigation (2.1.1) | Left/Right arrows | Prev/next work by keyboard; overlay arrow buttons are reachable | |
| P-B7 | Caption (1.1.1) | SR | Caption text is announced / associated with the image | |

### 4C. Campaign viewer / carousel

The carousel is an Embla region with `role="region"` + label (P54-C).

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| P-C1 | Region label (1.3.1) | SR lands on the carousel | Announced as a labelled region | |
| P-C2 | Keyboard control (2.1.1) | Tab to it, arrows / prev-next | Slides change by keyboard; controls reachable | |
| P-C3 | Autoplay + motion (2.2.2, 2.3.3) | Watch; enable reduce-motion | Autoplay is pausable/stoppable; reduce-motion halts autoplay | |
| P-C4 | Dot navigator (4.1.2) | SR + keyboard | Dots have names/state (current slide) and are operable | |

### 4D. Auth bar + login modal (JWT mode)

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| P-A1 | Auth bar reach | `Tab` | Sign-in control reachable + labelled | |
| P-A2 | Login dialog (4.1.2) | Open it | `role="dialog"`, named; focus moves in; Esc closes; focus returns | |
| P-A3 | Form labels (1.3.1, 3.3.2) | SR each field | Every field has a programmatic label (not placeholder-only) | |
| P-A4 | Error messaging (3.3.1, 4.1.3) | Submit empty/invalid | Errors are announced and associated with the field | |

### 4E. Shadow-DOM exposure (the biggest untested risk)

The public gallery is inside an **open** shadow root. ARIA IDs (`aria-labelledby`/`aria-controls`/
`aria-describedby`) do **not** cross the shadow boundary.

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| P-S1 | Region exposed | SR-navigate the host page | The gallery content is reachable/announced in the host page's AT tree | |
| P-S2 | ARIA references resolve (1.3.1, 4.1.2) | SR over labelled controls inside the gallery | Controls relying on `aria-labelledby`/`-controls` announce correctly (IDs resolve **within** the shadow root, not to the light DOM) | |
| P-S3 | With vs without shadow | Compare `?shadow=0` vs default | AT behaviour is equivalent; no regression unique to the shadow path | |
| P-S4 | Live regions across boundary (4.1.3) | Trigger an `aria-live` update inside the gallery | The announcement still fires with shadow DOM on | |

---

## 5. Admin surfaces

### 5A. Admin Panel (tabbed)

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| A-P1 | Tab widget (4.1.2, 2.1.1) | Arrow keys on the tab strip | Tabs use `role="tab"`/`tablist`/`tabpanel`; arrow keys move between tabs; selected state announced | |
| A-P2 | Each tab's content reachable | `Tab` through campaigns / media / access / analytics / audit | All controls reachable + operable by keyboard | |
| A-P3 | Data tables (1.3.1) | SR over a table | Column headers announced with cells (th/scope) | |
| A-P4 | Sort/filter controls (4.1.2) | SR + keyboard | Named, operable; state (sort direction / active filter) announced | |
| A-P5 | Bulk actions | Keyboard | Multi-select + action controls reachable and labelled | |

### 5B. Settings panel

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| A-S1 | Accordion/drawer (4.1.2) | Keyboard expand/collapse | Sections are keyboard-operable; expanded state announced | |
| A-S2 | Form controls (1.3.1, 3.3.2) | SR each control | Every input/select/switch/segmented-control has a label; grouping via fieldset/legend where relevant | |
| A-S3 | Segmented controls (4.1.2) | Arrow keys | Operable by keyboard; current option announced (note: contrast of inactive labels is now AA-gated) | |
| A-S4 | Live preview updates (4.1.3) | Change a setting | Preview changes don't steal focus; meaningful changes announced if needed | |

### 5C. Modals (general pattern — applies to ~36 modals)

Test 2–3 representative modals (e.g. Unified Campaign, Gallery Config Editor, a confirm dialog).

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| A-M1 | Focus move-in | Open | Focus moves into the modal | |
| A-M2 | Focus trap (2.1.2) | `Tab` cycle | Focus stays within the modal | |
| A-M3 | Close paths | `Esc`, close button, overlay | Close button has a name (global default set in P60-D); focus returns to the trigger | |
| A-M4 | Dialog name (4.1.2) | SR | Announced as a dialog with a meaningful name | |
| A-M5 | Nested/stacked modals | Open a modal from a modal | Focus + Esc behave correctly across the stack | |

---

## 6. LayoutBuilder (heaviest surface — canvas + dockview panels)

The builder is a dockview app (Canvas / Layers / Media / Properties panels) with a drag/drop,
absolutely-positioned canvas. **Known:** the builder modal sets `closeOnEscape={false}` (dismiss via
its close button). Text layers, per-breakpoint editing, and the preset gallery are **Pro** (absent
from the free build) — audit them in a Pro/dev build.

| # | Check | Steps | Pass | Result |
|---|---|---|---|---|
| L1 | Enter/exit (2.1.2) | Open the builder; try to leave | Focus enters; the modal is dismissible by keyboard via its close button; focus returns | |
| L2 | Panel reachability | `Tab` across dockview panels | Each panel (Canvas/Layers/Media/Properties) and its controls are reachable | |
| L3 | Canvas operability (2.1.1, 2.5.7) | Try to add/select/move/resize a slot **by keyboard** | Slots can be selected and manipulated without a mouse — **or** a documented keyboard alternative exists to the drag/drop | |
| L4 | Layer list (4.1.2) | SR + keyboard on the Layers panel | Layers have names/roles; reorder/visibility/lock controls are labelled + operable | |
| L5 | Properties panel (1.3.1, 3.3.2) | SR each field | Position/size/typography/etc. inputs are labelled | |
| L6 | Selection announced (4.1.3) | Select a slot/layer | The current selection is conveyed to AT (not colour-only) | |
| L7 | Pro upsell gating (build-dependent) | Free build: the add-text / breakpoint / preset controls | In the free build they're absent; in Pro they're operable and labelled | |

> **Note:** the canvas drag/drop is the highest-risk area for keyboard/AT. If keyboard manipulation
> isn't feasible today, log it (L3) as a known gap with the intended remediation (keyboard nudge/resize
> or an accessible alternative), rather than blocking.

---

## 6B. Framework components (Phase 80): the keyboard gate

Phase 80 Key Decision C counts a framework component done only when its keyboard gate is closed.
Since 2026-10-02 the gate has two halves:

- **The keyboard contract, automated** (P80-D). Every key press this section used to ask a person
  to make is now asserted in a browser by `e2e/ui-keyboard.spec.ts` and the specs it references,
  on the configuration the product ships: the `overlay-root` portal default, on both the shadow and
  the light mount. Nothing in table 6B.1 needs doing by hand.
- **The screen-reader pass, manual** (P80-E). What a screen reader actually *says* cannot be
  asserted from the test environment. Table 6B.3 is the script, and 6B.4 is where the result goes.

> **The page to test on is the showcase, not Storybook.** Storybook renders in the light DOM with
> no shadow root, so it cannot show the defects this framework exists to remove: focus returning
> across a shadow boundary, and ARIA references between two roots. Start the dev server with
> `npm run dev` and open
> `http://localhost:5173/src/ui/showcase/index.html?keyboard=1&mount=shadow&theme=default-dark`.
> Swap `theme=default-light` for the light pass. `?keyboard=1` turns every section on.
>
> **Section 0's console snippets do not apply here either.** The showcase's host is `#showcase`,
> not `#root`. Its own styles are on `document.getElementById('showcase').shadowRoot`. Since P80-F
> a menu, popover, tooltip or listbox opens in its trigger's root, which for the `inline` copies is
> that same shadow root; dialogs, drawers, confirms and toasts are in
> `document.querySelector('[data-mullion-overlay-root]').shadowRoot`.

The page renders each family twice: once in the gallery's shadow root (labels start `inline`) and
once inside the overlay root (labels start `overlay`). Use the `inline` copies: that is where a
real gallery's controls live, and the `overlay` copies exist to prove what changes when a trigger
and its popup share a root.

### 6B.1 The keyboard contract, per family (automated)

The contracts are the WAI-ARIA Authoring Practices' patterns as Phase 80 built them. Two depart
from Mantine on purpose: tabs activate manually (arrows move focus, Enter selects), and the
accordion takes no arrow keys. One corrects the script this section used to carry: **a disabled
menu item is focusable and does nothing when activated.** The Authoring Practices recommend that,
so a screen-reader user can discover it; the old check 6 asked for it to be skipped.

| Family | What is asserted | Where |
|---|---|---|
| Modal, drawer | Enter opens with focus inside; Tab and Shift+Tab stay inside; Escape closes and returns focus to the trigger; named by its title | `ui-keyboard` "modal and drawer"; `ui-overlays` "focus" |
| Popover | Enter and Space open with focus inside; Escape returns focus; Tab closes it and lands on the next stop after the trigger; named by its trigger | `ui-keyboard` "popover and tooltip"; `ui-overlays` "the axe gate" |
| Tooltip | Opens on keyboard focus; Escape dismisses | `ui-keyboard` "popover and tooltip" |
| Menu | Enter, Space and ArrowDown open on the first item; arrows, Home, End and typeahead move; a disabled item is focusable and inert; Enter activates and Escape closes, both returning focus; Tab closes it and lands on the next stop; named by its trigger | `ui-keyboard` "menu"; `ui-overlays` "dismissal" |
| Stacked modals | A modal opened over another, or two opened at once, leaves only the top one exposed; closing it exposes the one below; the toast region stays exposed | `ui-overlays` "a modal hides what is behind it" |
| Text, textarea, password, number | Tab order and names; the password reveal toggles by keyboard and reports `aria-pressed`; number arrows step, Home and End go to the bounds, values clamp | `ui-keyboard` "the input family" |
| Select | Space opens with focus on an option; typing on the closed field picks; arrows and Enter commit; Escape returns focus across the shadow boundary; the listbox is named by the field | `ui-keyboard` "the select family"; `ui-selects` "a keyboard can operate it" |
| Searchable select, multiselect, tags | Typing filters; focus stays in the field; Enter picks and the multiselect stays open; Enter adds a tag; Backspace removes the last | `ui-keyboard` "the select family"; `ui-selects` |
| Tabs | Arrows move focus without switching; Enter switches; Home and End; Tab moves into the panel | `ui-keyboard`; `ui-choices` "the tab bar" |
| Segmented control, chip group | One tab stop; arrows move the choice | `ui-keyboard`; `ui-choices` |
| Accordion | Enter and Space toggle; arrows do nothing | `ui-keyboard` |
| Checkbox, switch | Space toggles both; Enter toggles only the switch | `ui-keyboard` |
| Slider | Arrows step; Page keys take the large step; Home and End go to the bounds; the thumb shows the ring | `ui-keyboard`; `ui-choices` |
| Pagination | Every page is a tab stop; Enter makes it current | `ui-keyboard` |
| Colour input | The swatch opens the picker with focus on its surface; arrows on the surface change the value; Tab walks hue, opacity and swatches; Escape returns to the swatch | `ui-keyboard` |
| Toasts | F6 reaches the stack; Tab reaches the toast and then its close button, both with the ring; Enter dismisses and restores focus to where it was; one toast per page however many galleries | `ui-keyboard` "the managers"; `ui-managers` "a page with two galleries" |
| Confirm dialog | Focus moves in; Tab and Shift+Tab stay inside; Escape closes and returns focus | `ui-keyboard`; `ui-managers` |
| Every family | The accessibility tree a screen reader is given: role, name, state | `ui-keyboard` "what a screen reader is given" |

### 6B.2 Known defects the gate found (2026-10-02), all fixed

P80-D wrote each as the contract it should meet, marked as an expected failure. P80-F fixed every
one the same day, and the marks are gone. Running the overlay-root axe gates for real (they had
been scanning nothing) found three more, fixed in the same track.

| Defect | Where it showed | Status |
|---|---|---|
| Tab could not leave an open menu or popover | Every menu and popover whose trigger was in a different root from the overlay root | ✓ Fixed: anchored popups open in their trigger's root |
| An open menu had no accessible name | Same | ✓ Fixed, same cause |
| The password field was not masked | `PasswordInput` | ✓ Fixed |
| The slider showed no focus ring | `Slider`, and the colour picker's hue and opacity rails | ✓ Fixed |
| A focused toast showed no indicator | The toast itself, not its close button | ✓ Fixed |
| Every dialog exposed a second `banner` landmark | Modal, drawer, confirm | ✓ Fixed |
| A popover was an unnamed dialog | Every popover | ✓ Fixed: named by its trigger |
| A toast with no title was an unnamed dialog | `notify.show({ message })` | ✓ Fixed: named by its message |
| A modal opened over another hid nothing in the overlay root | Stacked modals, and anything else in the overlay root | ✓ Fixed |

**The tooltip is visual only, by decision** (P80-F item 10). Its text is not exposed to assistive
technology, so no tooltip may carry information its control does not. Phase 81 owns the 22
product tooltips that do today.

### 6B.3 The screen-reader script (P80-E)

One screen reader is enough: NVDA with Firefox, or VoiceOver with Safari. Do it on the shadow mount,
once on `default-dark` and once on `default-light`. Listen for what each row names; anything
different is a row in §7.

**With NVDA**, read §2's two-modes note first. Keep the Speech viewer open and paste from it into
6B.4. Use `Tab` to reach each control, `Enter` or `Space` to open it, the arrows inside it, and
`Escape` to close. When an `Escape` only announces "browse mode", that was NVDA leaving focus mode,
not the popup failing to close: press it again before recording a failure. The "In browse mode"
checks in the table mean press `NVDA+Space` until NVDA says "browse mode", then explore with the
arrows and single letters.

| Family | Do | Listen for |
|---|---|---|
| Modal, drawer | Open from the trigger, Escape | "dialog" and its title on opening; the Close button named; the trigger announced again after Escape |
| Popover | Open, Escape | "dialog, inline popover", then the content |
| Tooltip | Tab onto the tooltip button | The button's own name only. The tooltip text is expected **not** to be spoken, by decision (6B.2); confirm |
| Menu | Open the long menu, arrow through it | "inline long menu, menu" with an item count; each item; "disabled export" announced as unavailable |
| Stacked modals | Open the inline modal, then "stack another" | In browse mode, only the stacked dialog's content is reachable; after Escape, the first dialog's is again |
| Text, textarea | Tab through | Each label, and the description under "gallery name" |
| Password | Type, then Tab to the reveal and press Space | Characters not echoed while hidden; "Show password, toggle button, not pressed", then "pressed" |
| Number | Arrow up and down | The value after each press. The field is a text box rather than a spin button, so check the change is announced at all |
| Select | Open the role select and arrow | "combobox", its name and value; each option with its position; the selected one marked selected |
| Searchable select, multiselect, tags | Type, arrow, Enter | The highlighted option read while focus stays in the field; picked items and added tags announced |
| Tabs, segmented, accordion | Arrow and activate | "tab, selected, 1 of 3"; "radio button, checked"; "button, expanded" or "collapsed" |
| Checkbox, switch, chips | Toggle each | Checked state; the second checkbox as "mixed" or "half checked"; the switch as on or off |
| Slider | Arrow | The value spoken on each step. Expect "0.5" rather than "50%": the visible label is not the announced value |
| Pagination | Tab to page 2, Enter | "navigation, inline pages"; "Page 2" and then "current page" |
| Colour input | Open the picker, arrow on the surface | The surface's value in words; hue and opacity values; the swatches named by their colour |
| Toasts | Raise one from "managers" without moving focus | **The message read aloud as it appears**, with focus left where it was. This is the one thing on the list no machine can check. Then raise one with a modal open: it should still be read |
| Confirm dialog | Open it, Tab, Escape | "dialog, Discard changes?", the body, both buttons |

Two visual checks belong with the pass, because a person is already looking. On both themes at
100% zoom: is the two-tone ring easy to see on every control (standing rule 9: judge it at true
size), and can you find the highlighted row while arrowing quickly through the long menu?

### 6B.4 Results (P80-E)

| Family | Screen reader and browser | Date | Result | Notes |
|---|---|---|---|---|
| Modal, drawer | | | ⬜ | |
| Popover, tooltip | | | ⬜ | |
| Menu | | | ⬜ | |
| Input family | | | ⬜ | |
| Select family | | | ⬜ | |
| Tabs, segmented, accordion | | | ⬜ | |
| Checkbox, switch, chips, slider | | | ⬜ | |
| Pagination | | | ⬜ | |
| Colour input | | | ⬜ | |
| Toasts | | | ⬜ | |
| Confirm dialog | | | ⬜ | |
| Ring visibility, light and dark | | | ⬜ | |

---

## 7. Issue log

One row per distinct problem. Severity: **Blocker** (fails a core task) / **Serious** / **Moderate** /
**Minor**.

| ID | Date | Surface / check | WCAG | AT + browser | What happened (expected vs actual) | Severity | Status |
|---|---|---|---|---|---|---|---|
| _e.g. A11Y-001_ | 2026-07-11 | L3 (builder canvas) | 2.1.1 | NVDA + FF | Can't move a slot by keyboard; drag only | Serious | Open |
|  |  |  |  |  |  |  |  |

---

## 8. Coverage tracker

| Surface | Keyboard | Focus mgmt | Screen reader | Contrast states | Reduced motion | Zoom/reflow | Last run | By |
|---|---|---|---|---|---|---|---|---|
| 4A Gallery listing | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | — |
| 4B Lightbox | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | — |
| 4C Carousel / viewer | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | — |
| 4D Auth / login | ⬜ | ⬜ | ⬜ | ⬜ | n/a | ⬜ | — | — |
| 4E Shadow-DOM | ⬜ | ⬜ | ⬜ | n/a | n/a | ⬜ | — | — |
| 5A Admin Panel | ⬜ | ⬜ | ⬜ | ⬜ | n/a | ⬜ | — | — |
| 5B Settings | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | — |
| 5C Modals | ⬜ | ⬜ | ⬜ | ⬜ | n/a | ⬜ | — | — |
| 6 LayoutBuilder | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | — |
| 6B Framework components (Phase 80) | ✅ automated | ✅ automated | ⬜ P80-E | n/a | n/a | n/a | 2026-10-02 (automated half; defects fixed by P80-F) | P80-D, P80-F |

Legend: ⬜ not started · 🟡 partial · ✅ done. Update after each run.

---

## 9. Changelog (living doc)

- **2026-10-02** P80-F fixed every defect in §6B.2 and three more, and decided the tooltip is
  visual only. Menus, popovers, tooltips and listboxes now open in their trigger's root. The script
  in §6B.3 is updated to what should now be heard, with a stacked-modal row added and a check
  that a toast raised behind a dialog is still read.

- **2026-10-02** Rewrote §6B for every Phase 80 component family. The keyboard checks are now
  automated by `e2e/ui-keyboard.spec.ts` (Phase 80 Key Decision C, revised that day), and the
  section is the screen-reader script for track P80-E. The test page moved from Storybook to the
  showcase, which renders the shadow mount the product ships. Old check 6 was corrected: a disabled
  menu item stays focusable.
- **2026-09-13** — Added §6B, the keyboard and screen-reader script for the framework overlays
  built in P80-A. Not yet run: it is the fourth of the four gates in Phase 80 Key Decision C, and
  those components are complete on the other three until someone works through it.
- **2026-07-11** — Doc created (P62-H). Sections: setup, global checks, public/admin/builder surfaces,
  Shadow-DOM, issue log, coverage tracker. Seeded from the code-level static review in
  [ACCESSIBILITY.md](ACCESSIBILITY.md) §2. _Next candidates to add: per-adapter gallery checks
  (14 adapters), theme-by-theme contrast-state spot-checks, and a WP-admin landmark decision._
