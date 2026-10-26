# Phase 81 - Consumer migration and Mantine removal

**Status:** In progress (P81-A pass 1)
**Created:** 2026-09-10
**Last updated:** 2026-10-25 (P81-E added from Phase 80's audit). 2026-10-02 (P80-F settled the manager hosts and the tooltip rule, and placed the 22 tooltips that break it into B; earlier the same day Phase 80's follow-ons were placed into B and D, including `useBroadcastStaleness` and the notification and confirm migration; the Settings panel clipping defect added to B on 2026-09-14)

### Tracks

| Track | Description | Status | Effort |
|-------|-------------|--------|--------|
| P81-A | Style props and the size and variant scales: the mechanical bulk of the migration | In progress: pass 1 landed, pass 2 rides each name flip | Large |
| P81-B | Migrate the consumers, theming-critical surfaces first | Planned | Large |
| P81-C | Test, story and e2e harness migration | Planned | Medium |
| P81-D | Remove Mantine and delete the workarounds it required | Planned | Small-Medium |
| P81-E | Small defects found during Phase 80's audit: an escaped ampersand in every interface string, a flickering admin menu at 320px, alt text lost on export, a broken CLI, and three layout faults | Planned | Small-Medium |
| P81-F | The size basis: one token step is the same physical size on every host, whatever the host's root font size | Done | Small-Medium |

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
1a. **P81-F** before P81-A's pass 2 reaches `Stack` and `Group`. Pass 2 reads numbers in the tokens' basis, so the basis has to be fixed first (designer, 2026-10-25).
4. **P81-D** last, and only when the allow-list is empty or its residue is documented.

---

## Track P81-A - Style props and the size and variant scales

### Problem

1,535 Mantine style props and about 1,500 literal `size`, `variant`, `radius` and `color` props are spread across the component tree. The framework deliberately does not reproduce Mantine's full style-prop surface, so these cannot be carried over unchanged.

### Fix

A codemod for the direct mappings onto the framework's layout primitive props, which render as inline custom properties. Colour and typography props become `Text` variants or classes. The `size` and `variant` scales are the designer's to set, and the mapping from Mantine's scale to ours is written down once and applied uniformly rather than decided per file.

**Data point from P79-B (2026-09-12).** Responsive style props were partly inert until P79-B. React 19 inserts Mantine's hoisted `__mdi__` sheet as a root's first child, so a responsive prop setting the same property as the component's core rule (`Card` with `p={{ base: 'sm', md: 'md' }}`, four sites in `AccessTab`) lost to the core rule at the base breakpoint while Mantine's sheet was a `<style>` after it. P79-B registers Mantine's sheet in the `mullion.vendor` cascade layer, so the hoisted rule now wins and those cards take `sm` padding below `md`. The codemod should carry the responsive intent (the values as written), not what painted before P79-B.

**Data point from P79-0 (2026-09-13).** The framework `Container` scale is `40rem` to `90rem` (`xs` to `xl`) where Mantine's is 540px to 1320px, so the names do not map one to one: the single `size="sm"` call site moves from 720px to 768px. The mapping document should list the container scale beside the spacing scale rather than carry the step names across unchanged. `Text` and `Title` carry no colour of their own and inherit, as Mantine's do, so `c="dimmed"` becomes `tone="muted"` and an unqualified `Text` needs nothing.

### Pass 1 (2026-10-25)

**The execution order above cannot work as written, so A runs in two passes.** Consumers render Mantine until their name flips in `src/ui/index.ts`, and Mantine ignores the framework's prop names: renaming `c="dimmed"` to `tone="muted"` ahead of the flip silently un-styles 236 `Text` sites. User decision, 2026-10-25: pass 1 moves now only the style props the framework drops entirely; pass 2 runs the renames per component name, in the commit that flips it. The mapping for both lives in [UI_SCALE_MAPPING.md](UI_SCALE_MAPPING.md).

**Pass 1 writes inline styles, not utility classes.** Utility classes were the user's first choice and were rejected on measurement. Mantine renders a style prop as an inline style, which beats everything. Mantine's own sheet sets `margin: 0` on `Text`, `Title` and about 75 other rules, and `main.tsx` loads that sheet unlayered into the document, where it beats `@layer mullion.components`. A `mullion-mt-sm` class would therefore lose on light-mount galleries and in wp-admin. Moving the prop into `style` on the same element, ahead of anything the caller wrote (Mantine's `Box` merges `style` after the style props), renders the same declaration under either library.

**Values keep Mantine's reading exactly.** A scale step becomes `var(--mullion-spacing-sm, var(--mantine-spacing-sm))`. The fallback serves the 72 `.tsx` files reachable from the wp-admin apps, which run under a bare `MantineProvider` with no `--mullion-*` tokens until P81-B. Mantine's default spacing and font-size scales equal `_base.json`'s, no theme overrides either, and `--mantine-scale` is never set, so the two variables are interchangeable wherever both exist. A number becomes rem (`4` is `0.25rem`) because Mantine's `rem()` divides by 16; pixels would match only on a host whose root font size is 16px. That exposed a discrepancy in `scale.ts`, which reads numbers as pixels while claiming to match Mantine. It is recorded as an open question in the mapping document, for pass 2.

**What moved.** `scripts/ui-codemod-pass1.mjs` moved 330 props on 280 elements in 66 files. It refuses a site whose merge order it cannot prove (a spread that might carry `style`, a non-literal `style`, an expression under a non-identity resolver). `getMullionDebugProps()` spreads are allowed because they return only `data-*` attributes. 14 sites were done by hand from that list, each checked against its type (`useTypographyStyle` returns `CSSProperties`, `SpaceSelector`'s `style` is `CSSProperties`, the badge offsets are numbers). Two responsive `h` objects stay for pass 2, since the framework has no responsive prop form. 265 colour props (`c`, `bg`, `ff`) are pass 2's by design.

**How it was verified.** `playwright.capture.config.ts` and `scripts/pixel-diff.mjs` give an exact before/after comparison with no tolerance. Two captures of the unchanged tree agreed on all 16 `theme-qa` screenshots to the pixel, so the noise floor is zero and any differing pixel after the codemod is a finding. After the codemod, three captures were taken. Two matched both "before" captures exactly on all 16. The first differed by 25 pixels at the four corners of the open popup in `theme-selector-open-default-light`, and a third capture of the same tree did not reproduce it. That snapshot is the light twin of the non-deterministic dark one filed under P81-B's Settings batch, and the light one flips too, about once in five captures. Typecheck, lint, the allow-list check, vitest (277 files, 4,469 tests) and the full Playwright suite (205 tests) all pass.

**What the pixel diff does not cover.** `theme-qa` photographs the gallery shell and the Settings drawer. The Admin Panel, the Layout Builder, the modals and the wp-admin apps have no screenshots, so their neutrality rests on the construction argument above, which is the same for every site, and on the functional suites. Pass 2 cannot lean on that argument because it changes pixels on purpose, so each surface batch needs its own captures first.

### Pass 2 mapping settled (2026-10-25)

The designer answered every open row of the mapping (`designer-answers-ui-scale-mapping-2026-10-25.md`), and [UI_SCALE_MAPPING.md](UI_SCALE_MAPPING.md) now carries them as settled: colour names map to roles by what the component is, `Badge variant="dot"` becomes an outlined toned badge whose glyph replaces the dot, field `filled` is dropped, sub-token text floors to `xs`. Numbers are read as rem in the tokens' basis, which made the size basis itself the question: measured unprotected, and filed as P81-F. The data the designer asked for went back the same day (`ui-scale-mapping-data-2026-10-25.md`) with two questions still open: whether 6px (36 of the 136 numeric gaps) gets a step, and whether the builder's one inline-rename field earns a `bare` prop. The field-variant count in the first draft was wrong (28); it is 33, because `ColorInput` was missed.

### Pass 2: Stack and Group (2026-10-25)

**The rungs first.** `4xs`, `3xs` and `2xs` joined the spacing scale as optional keys, filled from `_base.json` and from the generator for a theme that predates them, so a runtime or uploaded theme still validates. Only `spacingValue` resolves them; radius and type keep five rungs.

**The wp-admin apps needed a provider before anything could flip.** The 72 files reachable from them rendered under a bare `MantineProvider`, so the framework's `Stack` would have had no `layout.css` and no tokens there: no `display: flex`. Both apps now mount `MullionProvider` scoped to their host, on `default-light` to match the Mantine default they always rendered in. Every sheet the provider adopts into the wp-admin document was checked first: all are scoped (`.mullion-gallery`, CSS-module classes, dockview's own) or already loaded there. This was P81-B's wp-admin item; pass 2 cannot start without it. The pages still need a browser check on the dev site.

**The codemod.** `scripts/ui-codemod-pass2.mjs Stack,Group` made 303 edits in 105 files: `p`/`px`/`py` renamed, numeric gaps folded onto the rungs per the designer's table, `component="span"` turned into `render={<span />}`, and the direct `@mantine/core` imports of the two names moved to `@/ui` (joining an existing `@/ui` import where there was one, and keeping multi-line imports multi-line). Most of the app had imported them from Mantine directly rather than through the barrel, so the allow-list holds at 178: every moved file still names something else from Mantine. Six gaps went to the designer for review. `packages/shared-ui` cannot import `@/ui` and stays on Mantine until batch zero.

**Typecheck found three framework type gaps the showcase never exercised.** Layout props did not admit ordinary HTML attributes (`role`, `draggable`, drag handlers), though they always reached the DOM; `UiStyle` rejected a value typed `CSSProperties`, because an interface has no index signature; and `Justify` omitted CSS values such as `left`. All three were widened in the framework rather than cast at call sites.

**The pixel diff caught a framework defect.** The first capture after the flip moved 15 of 16 snapshots in one band: the gallery's filter chips had spread across their row. Custom properties inherit, so the inner chip `Group`, which sets no `justify`, read its parent's `space-between`; measured in a nesting fixture, it also inherited the parent's `align`, `wrap` and 20px of padding. Every layout primitive now resets the per-instance properties it reads, and inline values still win. `e2e/layout-nesting.spec.ts` failed on every property before the fix. Other families read `--mullion-radius`, `--mullion-pad` and their sizes the same way, so each gets this check before it flips; `Card.Section` reading its card's padding is the one deliberate inheritance found so far.

**Verified.** After the fix, one capture matched the original on all 16 snapshots and the other differed only at the known flaky popup corners. Lint, typecheck, vitest (278 files, 4,478 tests) and the full Playwright suite (210) pass. `Group grow` behaves differently from Mantine's when a child's content is wider than its share (37 sites, none photographed); that question went to the designer with the six review sites in `pass-two-begins-2026-10-25.md`.

### Pass 2 review round (2026-10-26)

The designer answered `pass-two-begins` the same night (`designer-answers-pass-two-2026-10-26.md`).

- **`Group grow` keeps equal columns whatever their content**, Mantine's behaviour: a panel's rows have to agree on where the columns are, and a field's width should not depend on its label. The framework's `flex: 1 1 0` let a wide child's minimum width wrap it onto its own line. `min-width: 0` fixes it. The nesting test's first version passed before the fix, because two wrapped children each fill a line and so measure "equal"; it now also asserts they share a line, and failed before the fix. Stacking a grow row that is too narrow for its fields is a P81-B panel rule, not this one.
- **A review's options are the adjacent rungs, never the old literal.** A literal needs a conversation.
- **The two sites the designer wanted looked at both take `2xs`,** the icon-and-label rung. Measured on the dev site with the gap switched inline: the campaign cover's company badge (logo then name) read detached at `xs` and crowded at `3xs`, and at `2xs` it now matches the campaign card's company badge. The section heading, with an 18px icon stood in for the one the site has switched off, read detached at `xs` and not cramped at `2xs`.
- **The deliberate inheritance is written down where the reset lives:** `layout.css`'s reset comment and `surface.css`'s `Card.Section` rule both name it.

**The wp-admin pages, checked on the redeployed plugin.** Gallery Spaces and Asset Library mount under the new provider with all 11 framework layout elements rendering as flex with token gaps, no Mantine `Group` or `Stack` left, and WordPress's chrome untouched. wp-admin's root is 16px and the user default is 16px, so the size basis there is exactly 1, which settles P81-F's open point about it. The only console errors were the service worker refusing the dev site's self-signed certificate in the test browser. The check found one unrelated defect, the `{{NAME}} (DEFAULT)` badge, filed under P81-E.

### Pass 2: Text and Title (2026-10-26)

**Parity first.** Reading the two `Text` components side by side found four differences, and each was settled in the framework before any call site moved. Mantine's line height follows the size step (1.4 at `xs` to 1.65 at `xl`), so the framework's fixed 1.55 would have re-spaced the 201 `size="xs"` sites; the rungs are now framework constants and `Text` picks the one for its size. Mantine resets an inner `Text` to regular weight, where the framework would have inherited a parent's weight through the same custom-property leak as the layout family; `.mullion-text` now resets it. The framework's `text-transform` defaulted to `none`, which blocks the natural inheritance a `Text` inside an uppercase badge relies on; it defaults to `inherit`. Size alone keeps inheriting, because Mantine's does (`--text-fz`). `Title` renders at 700, Mantine's heading weight and what every title has shown, rather than the framework's 600, until the designer decides. `e2e/layout-nesting.spec.ts` now nests a bare `Text` in a bold, large, uppercase one and asserts the inner takes size, line height and transform but not weight.

**The attribute typing moved up a level.** The layout family's fix for `role`, `id` and handlers became `UiAttributes<E>` in `element.tsx`, used by layout and typography alike, so each family that flips gets it without repeating it.

**The codemod.** `ui-codemod-pass2.mjs Text,Title` made 642 edits in 95 files with per-prop handlers: colour names to tones by the designer's table (`dimmed` and `gray` to `muted`, `dark` and `inherit` dropped), `fw`/`ta`/`tt`/`fz` renamed, `ff="monospace"` to `font="mono"`, `fs="italic"` to `italic`, `size="h3"` on a title to `size={3}`, and any pixel size under 12 floored to `xs` and listed. The allow-list fell from 178 to 175.

**By hand, seven sites.** Two conditional colours became conditional tones; `orange.4` became `warning`, the designer's own example; a drop-zone hint that turns blue while dragging over it became `primary`, since it is something the user operates; Mantine's `inherit` was dropped because the framework's inner span already inherits size and line height. The 9px white caption over a media thumbnail took `xs` on the designer's scrim, reaching 0.60 black at the caption line. **The lightbox caption was a contrast defect:** white text on a gradient of the theme's own background colour, so on every light theme it was white on near-white. It now takes the theme's text colour, which reads on that ground in every theme.

**Verified, and one regression found by looking.** Two fresh captures matched each other exactly and differed from the original only in muted text, with no glyph moving: "Access mode" and the empty-state line are slightly darker, the `muted` rung replacing Mantine's `dimmed` grey. In the open theme selector the same change was a regression: the checked option is filled with the primary colour, and its description went from a weak grey on teal to dark muted ink on teal, close to unreadable. The muted rung is measured against plain surfaces, never against that fill, so this was the README's "tint the ground or colour the ink, never both" in a transitional component. A rule in `chrome-portable.scss`, which P81-D deletes with the Mantine select, gives a toned `Text` inside a checked option the option's on-fill ink; the description now reads white on teal in both themes, better than it read before the flip. The framework's own `Select` marks the checked option with a check rather than a fill (P80-B), so the pair cannot recur once `Select` flips. Lint, the allow-list check, vitest (4,478) and the full Playwright suite (210) pass.

### The designer's Text and Title round (2026-10-26)

`designer-answers-text-title-2026-10-26.md` settled two things and asked for a CI row.

**Headings are 600.** The interface uses three weights, 400 body, 500 labels, 600 emphasis, and 700 belongs to the wordmark alone; the rule is now in `DESIGN_BRIEF.md`. `Title` moved to 600, and applying the rule found fifteen other 700s (the campaign viewer's stat figures, four builder panels' section labels, admin titles, the builder's template name and slot-number badges), all now 600.

**The caption scrim's number did not survive its own CI row.** The designer proposed that a caption over an image sit on a scrim reaching 0.60 opacity at the caption line, the theme's `background` with the theme's `text` where the surface is themed, and asked for a per-theme row proving `text` clears 4.5:1 over the worst photo. The row went into `contrastAudit.ts` (an all-white or all-black photo bounds every image, because browsers blend each sRGB channel linearly and luminance rises with every channel, so the row takes the weaker of the two). It reproduced the designer's two defaults exactly, 4.53 and 5.12, and failed 13 of the other 21 themes, worst Darcula at 2.40; theme text needs up to 0.81 (Catppuccin Latte). The scrim therefore reaches **0.85**, `CAPTION_SCRIM_OPACITY`, an engine constant that the lightbox paints through a token and the audit reads, so the gate checks what is drawn: every theme clears, the tightest at 5.01, and setting the constant back to 0.60 fails exactly the thirteen. Muted ink needs up to 0.99 on a scrim, so the lightbox's counter takes the theme's text. A browser check confirmed `color-mix()` resolves with its percentage from a custom property. Whether to keep one number or derive the opacity per theme went back to the designer with the badge question (`badges-and-the-scrim-2026-10-26.md`). The visitor-facing lightbox puts its caption below the image on a 93% black backdrop and never had this problem; its full review waits for `Select` and the dialogs, as the designer asked.

**Badges wait for a rule.** A toned badge carries its role glyph, and most of the product's 76 badges are not states: 19 categories, 18 counts, 19 tags or names and 5 roles against 15 states. The proposal sent with the full inventory: states take their role tone and glyph, everything else the neutral badge, with the two user-chosen colours (a space's, a company's) kept as data.

### Pass 2: Box, Center, Grid, SimpleGrid and Alert (2026-10-26)

**Four framework defects, found by reading before flipping.** `Box` wrote its padding as custom properties, but it has no class, so no rule read them: `<Box padding="md">` painted nothing, and the properties leaked into every descendant that does read them. It now writes `padding-block` and `padding-inline` as declarations, as Mantine's style props did. The feedback family (`Alert`, `Badge`, `Loader`, `Skeleton`) read `--mullion-pad`, `--mullion-radius` and their sizes with the same inheritance leak as the layout family, so an `Alert` inside a padded `Stack` took the stack's 32px; each now resets what it reads, and nothing in the framework relied on inheriting them (a button sizes its loader explicitly). `Alert` set `role="alert"` after the caller's props, which would have made the two `role="status"` alerts assertive; the role is now a default. `Container` read a number as pixels rather than in the size basis P81-F set up. The nesting spec gained a padded `Box` and an `Alert` inside a padded `Stack`; the alert check was proved by removing its reset, when it measured 32px.

**Three gaps for Mantine parity.** `Alert` gained `onClose` with a caller-supplied `closeLabel` (the framework has no strings of its own), rendering the framework's `CloseButton`. `SimpleGrid` gained Mantine's `xs` breakpoint. `UiAttributes` gained `ref`, which React 19 passes as a prop, and `Box`'s ref accepts any element because `render` can swap its tag.

**The codemod lost an edit and was fixed.** A file with two Mantine imports moving names into one existing `@/ui` import received two edits to the same range and came out corrupt; every moved name now lands in a single edit. The script also reports any Mantine style prop still on a flipped element instead of leaving it to reach the DOM, which is how `Box h={coverHeights}` surfaced.

**Responsive values moved into the components' CSS modules.** The gallery's empty state (`py={{ base: 60, md: 80 }}`) and three in the campaign viewer: the cover's height, which comes from site settings and so arrives as three inline custom properties with only the breakpoints in the module, the cover text's padding, and the stats grid's gap, which the module sets as `--mullion-gap` (unlayered, so it wins over the grid's own reset). The empty state is on a photographed surface and matched the previous capture to the pixel. The adapter-option strip in the gallery-layout settings used Mantine's fixed `gray.0`, near-white on every theme including the dark ones; it takes `surface2`.

**Verified.** Against the previous capture, the only change is the theme selector's checked-option description, from the ink fix made after that capture, plus the known flaky corners. Lint, the allow-list check (175 to 163), vitest (one snapshot updated, its diff five empty `class=""` attributes the framework `Box` does not print) and the full Playwright suite (210) pass.

**Not in this batch.** `Paper` and `Card` carry the elevation refresh (rule 13). `Badge` waits for the designer's rule. `Container` follows separately: it looked like a visitor-facing width change (Mantine's default is 960px with 16px inline padding, the framework's 1024px with none), but every gallery call site passes either an explicit width from `appMaxWidth` (default 1200px) or `fluid` when it is 0, and its inline padding from `appPadding`, so the defaults reach no visitor page. It flipped the same day: the one fall-through to Mantine's 960px default, the admin panel with both widths at 0, is pinned to 960, the gallery's two responsive `py` values moved into `CardGallery.module.scss`, and the photographed gallery shell, which these containers lay out, moved zero pixels. Lint, vitest (4,481) and the full Playwright suite (210) pass.

### The designer's badge and scrim round, and the Badge flip (2026-10-26)

`designer-answers-badges-scrim-2026-10-26.md` settled both questions.

**The themed caption scrim is derived per theme**, not a constant: the smallest opacity at which a theme's text clears 4.5:1 over the worst photo, floored at 0.60, below which a scrim reads as a smudge. It is the `caption-scrim` token in a new tier, `DERIVED_MEASURES`, beside the control heights, because the colour derivations' tests rightly require every value there to parse as a colour. On the bundled themes it runs 60% to 81%; the text audit reads the token as painted, a theme overriding it below its need fails (tested on Catppuccin Latte at 60%), and the registry now passes a theme's overrides to the text audit as it already did to the 1.4.11 one. The token was checked through the sanitiser into the emitted sheet.

**The visitor lightbox's caption does sit on the image sometimes.** The designer took its ground to be the 93% black backdrop, since the caption is placed below the image. Measured on the dev site at 1280 by 800, the caption block overlaps the image's band by 39px; with that photo the text happened to sit left of the image, but a wide image at the 90vw cap starts at x=64, under any caption. So the caption took the black scrim (rule 15, 0.60, white) and its `gray.4` counter took white, muted ink never going on a scrim. Both fixed overlays, the black scrim over the worst photo and the 93% backdrop over the worst page, are now audit rows, with a guard that `Lightbox.tsx` and the media picker still paint the audited opacities.

**Badges moved by the agreed split.** States take their role tone and glyph; a count that annotates a control (the active-filter count) takes `primary`; an urgent count (pending requests) is a state; categories, roles, names, tags and other counts are the neutral badge. The codemod gained an element-level hook that classifies by file and by text inside the badge, since a badge's meaning is not in its props, and spells out Mantine's defaults (`filled`, `md`) where a site left them so each badge keeps its shape. Nineteen sites whose colour was an expression were done by hand: severity and schedule helpers now return tones; media type, media source, template origin and role colours went, with their helper variables. "Unused" on the media usage badge is an urgent state and takes `danger`, listed for the designer.

**A correction to the inventory the designer ruled on.** The space-name badges' colour was not the user's data: `spaceColor()` hashes the instance id onto six Mantine palette names. So those badges went neutral like any other name, the settings drawer's P57-B machinery that read Mantine's variables back to paint them was removed, and `AdminPanel`'s `instanceId` prop, which existed only for that colour, went with it. Only the company badges carry a real user colour (`brandColor`); they keep it, with the white ink Mantine's filled badge gave them.

**The codemod's edit ordering was wrong.** An insertion and a deletion starting at the same offset (a new `tone` where the old `color` began) were applied insertion first, and the deletion ate the inserted text: two state badges silently kept their Mantine colour and three tags came out unparseable. Every badge file was reverted and the pass re-run with the wider edit applied first at a tie.

**Verified.** The badge flip moved nothing on the photographed surfaces, which carry no badges; the one differing snapshot was the theme select's four rounded corners, the antialiasing flake that snapshot has shown before. The space-badge unit test was rewritten for the neutral badge. Lint, the allow-list check (163), vitest (4,485, one unhandled teardown error from a Mantine transition timer that did not recur in two further runs) and the full Playwright suite (210) pass.

### Pass 2: Paper, Card and Card.Section, neutral first (2026-10-26)

**Split in two.** Rule 13 changes how surfaces look, and which `Paper` or `Card` counts as raised depends on its context, so the flip went first and painted exactly what Mantine did; the refresh goes after the designer has drawn the line between a panel and a raised panel (`badges-moved-surfaces-next-2026-10-26.md`).

**Framework parity, found by reading Mantine's sheet.** `Card` is padded md by default and is a positioning context; the framework's was neither, so un-propped cards would have lost 16px and absolutely positioned children (the campaign card's badges) would have positioned against the wrong ancestor. `Card.Section` conflated two values: it bled by its own padding rather than the card's and took the card's padding as its own, where Mantine's bleeds by the card's padding and has none. The card now publishes `--mullion-card-pad-*` for its sections, which nothing resets, and the "deliberate inheritance" exception recorded in the badge round is gone with the shared property. The surfaces also had the family leak (a `Paper` in a padded card took the card's padding, radius and ground) and now reset what they read. The nesting spec measured the card at 32px, the outer stack's `xl`, before the fix.

**One visible change on its own.** A bordered `Paper` used Mantine's fixed `gray-3` or `dark-4`, because the adapter set only the card's border; it now draws the theme's `border`, like the card.

**By hand.** `AccessTab`'s four responsive card paddings use the `useMediaQuery` hook at Mantine's md breakpoint, since that file has no registered stylesheet and an unregistered module would not reach the shadow root. The campaign card's responsive thumbnail band took the viewer-cover pattern in `CampaignCard.module.scss`. The campaign viewer's private notice was a `Paper` on Mantine's fixed `red.9` carrying the theme's text, dark on dark red on light themes; it is an assertive status message, now a filled danger `Alert`.

**Verified.** Photographed surfaces: only the theme selector's two corner flakes. `style-delivery.spec.ts` found the template-picker card by `.mantine-Card-root` and now finds it by a `data-testid` of ours (Decision D); its module-class assertion was tightened, because the framework's own `mullion-card` would have satisfied `/card/` alone. Lint, the allow-list check (163), vitest (4,485) and the full Playwright suite pass. The campaign card is visitor-facing and not photographed (the local data has no campaigns); it gets a look on the dev site at the next deploy.

### The designer's surfaces round (2026-10-26)

`designer-answers-surfaces-2026-10-26.md` settled the rule for surfaces: a container's ground is one rung above the ground it sits on, and where there is no rung above, it stays on that ground and takes `border` as a divider. It also made two small calls, both built: the media usage badge's "Unused" is `warning`, a nudge rather than an error, and the company badges pick black or white against the brand colour through `inkOn()` in the engine, exported from `@/ui`, whose comment says it is the better of two, not a guarantee (the test company's yellow went from white at 2.20:1 to black at 9.53:1).

**The campaign card, checked on the redeployed plugin.** Its zero padding is its own `padding={0}`; the thumbnail section sits 4px in because the site's card settings draw a 4px left accent border; the badges sit where the settings put them. The Access badge keeps its own eye icon instead of the success glyph, since the site passes one.

**The 31 surfaces were classified and sent before anything moves** (`surfaces-classified-2026-10-26.md`), with one premise of the designer's corrected: dialogs and drawers are not "already raised". The framework's `Modal` and `Drawer` paint `surface`, as the Mantine adapter did, so a card in a dialog has a rung above it and only a card inside such a card reaches the ceiling. Whether dialogs themselves should be raised went back as a question, with the table showing both outcomes. The admin panel's own card would lose its border under the rule as written, which is also flagged.

### Surfaces onto the ladder (2026-10-26)

`designer-answers-surfaces-classified-2026-10-26.md` kept dialogs and drawers on `surface`, since the backdrop is their elevation (a floating surface without a backdrop, a menu, a popover, a bar over a list, paints `surfaceRaised`), and corrected the designer's own table: a container that went up a rung carries `raised-bd` at every rung, the first included, and `border` is only a divider. So the admin panel's card keeps its edge on light themes by rule. Both clauses are now in rule 13.

**The framework needed an edge prop.** `raised` set the ground but no surface drew rule 13's edge, so `Paper` and `Card` gained `elevated`, which draws `raised-bd` (transparent on dark themes, so the box is the same size on every theme). Ground and edge stay independent because the ceiling case needs a raised ground with a divider. `e2e/surface-elevation.spec.ts` measures all three cases on `default-light` and `default-dark`.

**The batch.** 25 surfaces changed by the classified table: the admin panel's card is `elevated`; 23 panels over a panel are `raised elevated`; the one card at the ceiling (`MediaLibraryPicker.tsx:65`) is `raised withBorder`. The stat tiles in the analytics dashboard and the campaign viewer keep `border` as a divider, and the campaign card keeps the border its site settings draw. None of the 25 is on a photographed surface; the photographed set moved nothing beyond the known flake. Lint, vitest (4,489) and the full Playwright suite (212) pass. The admin panel on light and dark themes gets a look on the dev site at the next deploy.

**A numbering slip, corrected.** The caption-scrim rule was added as rule 14 of `COLOR-SPEC.md`, but rule 14 already existed (the `border` floor, 2026-10-07). It is rule 15 now, with the spec's header attribution, the phase notes and the visitor lightbox's comment corrected; the letters that called it rule 14 stand as sent, and the next one says so.

### Pass 2: the controls (2026-10-26)

**The framework's controls had drifted from Mantine's geometry.** Read off Mantine's stylesheet, an icon button is 18, 22, 28, 34 or 44px (28 by default), but the framework sized it at the input heights, 30 to 60px, which would have grown most icon buttons by 14px or more. Button side padding grows 14/18/22/26/32px with the size where the framework used 12/16/16/20/32; compact sizes have fixed heights and padding (xs is 22px with 7px) where the framework had an auto height; the default radius is `md`, not `sm`; and the label weight is 600, which the brief also asks of buttons, not 500. All are fixed in `control.css`, the icon button's default is `md`, and a numeric icon size reads in the size basis. `e2e/control-parity.spec.ts` measures every size and failed on each gap first. The controls also reset what they read, so a button in a rounded `Paper` no longer takes the paper's radius.

**API parity.** Control props admit HTML attributes (`title`, drag handlers). `FileButton` calls `onChange` with one file or null unless `multiple`, as Mantine's does, hands its render prop only the opener, and accepts `resetRef`.

**The batch.** `ui-codemod-pass2.mjs` made 240 edits in 76 files: control colours by the control table, `compact-*` to the step plus `compact`, and Mantine's `filled` default spelled out on icon buttons that relied on it. By hand: eight conditional icon-button colours (a toggled state is `primary`, its rest the neutral `default`, a lock is `warning`), `ConfirmModal`'s `confirmColor` became a typed `confirmTone` across its eleven callers, two `styles` objects became `style`, and the reset-link button's link attributes moved onto the `<a>` it renders. `Chip` stays on Mantine: the framework chip is one designed look and Mantine's had variants and a check mark, on the gallery's visitor-facing filter row, so it is the designer's review on its own. The allow-list fell from 163 to 161.

**What the captures show.** The admin's in-context settings gear went from Mantine's literal blue to the brand primary, by the rule. The Settings drawer's Cancel draws the framework's `default` variant border. **A disabled button changed character:** Mantine gave it a grey ground and a muted label; the framework draws its fill at 55% opacity, which on a light theme reads as an enabled button, faded. That went to the designer rather than being decided here. Seven unit tests asserted Mantine's `data-loading="true"` and now assert the attribute; one pinned `FileButton`'s old array-only callback. Lint, vitest and the full Playwright suite (213) pass.

### Pass 2: disabled controls and the chips (2026-10-26)

**Disabled is recessed.** The designer chose a neutral disabled state over the faded one: `background` ground, `border` edge, `borderStrong` ink, in every variant and tone, with no opacity (`COLOR-SPEC.md` rule 16). A loading button keeps its look, since it is busy rather than unavailable. `e2e/control-parity.spec.ts` reads the three colours off a disabled filled button and a disabled subtle danger icon button on both defaults; it failed on all of them first.

**The chips moved, in one look.** The designer kept the check mark as the signal that is not colour and chose one look, Mantine's `light`, for every chip (rule 17): `surface`, `border` and `text` at rest; the primary wash, a `primaryStroke` edge and the check when checked; hover moves only the edge; keyboard focus takes the inset ring, through a new `sibling-inset` focus mode for a clipped input. The framework chip took Mantine's geometry from its stylesheet (28px at `sm`, and a checked chip trades half its side padding for the check, so its width holds), lost its `tone` prop, and the codemod dropped the eight literal `variant` props across four files. The check shares the success glyph's path and takes no tone. At the designer's sign-off it went to a 2px stroke (the success glyph's 1.5px was the quietest thing on the chip, for the one signal that must survive without colour), and hovering a checked chip now deepens the wash to wash-strong and keeps the `primaryStroke` edge, where the first build swapped that edge for a neutral.

**Chip.Group defaulted the wrong way.** The framework group defaulted to `multiple`; Mantine's defaults to single choice, and the isotope filter relies on that without saying so. The default is now single choice, which kept that filter a radio group; one framework test that relied on the old default now says `multiple`.

**Two specs were measuring the old components.** The size-basis spec's gallery check measured `.mantine-Button-root` and `.mantine-Chip-label`, so after the button flip it measured only the chips, and after this one nothing past its own guard of five readings; it measures the framework's classes now. The showcase ring spec asserted the outset ring on the chip and asserts the inset one. The captures change in two places: the gallery's filter row (sent to the designer across six themes) and the settings drawer's disabled Save. Lint and vitest (4490) pass; the full Playwright run failed only on those two specs, and both pass after the fix.

### Pass 2: checkboxes, switches and segmented controls (2026-10-26)

**Geometry first, again.** A research pass compared Mantine's stylesheet with the framework's for the whole input family, and each claim used here was checked against Mantine's sheet before it was acted on. One was wrong: Mantine's segmented items are equal width only under `fullWidth`, not always, so that change was not made. What was fixed, all measured in `e2e/control-parity.spec.ts`, which failed on each first:

- **Checkbox and switch sizes.** The framework sized both in `em` off one font size, so every size step drew the same 18px box and the same 31.5 by 17.5 track. They now take Mantine's sizes per step (box 16 and 20px at `xs` and `sm`; track 32 by 16 and 38 by 20 with a 12 and 14px thumb). The switch keeps its audited border inside that outer size, and the thumb is centred in what is left, at the same inset either side.
- **The label row.** 12px from control to label, not 10, and a description now sits on the label's column as Mantine's did, where it had started under the control.
- **Segmented control.** 4px of track around the items rather than 2, an 8px radius with items and indicator 4px less, and item padding per step (6px at `xs`, 10px at `sm`) rather than 12px at every step. The 400 and 600 weights for resting and checked segments are kept: they are the framework's non-colour signal for the checked segment, where Mantine held 500 throughout.

**API.** A framework toggle hands `onChange` the boolean, where Mantine's handed it the event. The codemod rewrote 84 inline handlers that read only `e.currentTarget.checked` and lists anything else; one site passed a no-argument handler and needed nothing. 155 edits in 35 files. Three unit tests found a checkbox by label and now find it by role, because Base UI's checkbox and its hidden input share the label.

**The slider stays on Mantine for now.** Mantine's `xs` slider, 38 of the 56, is a 4px track with an 8px thumb that is all border; its default is an 8px track with a 16px thumb. The framework draws a 14px ringed thumb on a 4px track at every size. Matching Mantine would put an 8px drag target in the builder's property panels, which is a trade the designer makes, so it went to them with the fields' questions.

**What the captures showed.** Mantine's checked switch was close to invisible on both default themes in the settings drawer: a near-white track with a dot on light, a hollow ring on dark. The framework's is a filled primary track. The captures also caught a defect the parity spec had not: Base UI renders a field's description as a `<p>`, and neither the toggle nor the text field reset its margins, so each description sat 12px lower than it should and pushed the next field down. Both are reset, the spec measures the gap under a toggle's row and the text field description's margin, and it failed on both first. The described switch is still about 5px taller than Mantine's, because its description keeps the type scale's 1.4 line height where Mantine used 1.2.

**A test-harness lesson.** Readings taken straight after load landed mid-transition once the fixture grew: colours ease in from their initial values when the component sheet is adopted. The parity spec now waits for the showcase's finite animations to finish before it reads anything.

### Pass 2: the designer's toggle conditions, and the slider (2026-10-26)

The designer approved the toggles with conditions and chose the framework's one slider (`COLOR-SPEC.md` rules 18 and 19). Each change below failed `e2e/control-parity.spec.ts` first.

- **A checked switch's edge is `primaryStroke`.** The fill is 2.95:1 against `surface` on default-dark and the track is the switch's outline, so the edge takes the stroke and the fill stays the thumb's audited ground. The engine's 1.4.11 audit gained three named checks, `primaryStroke` on `surface`, `surface2` and `surfaceRaised`; all 23 themes pass, as they should, since the stroke is selected against those grounds, but a theme that overrides it now fails by name.
- **Segments reserve their 600 width.** Each label carries a hidden 600-weight copy as generated content under `visibility: hidden`, so choosing a segment moves nothing and the copy is neither read out nor found by a text query.
- **The "Items Per Page" label was muted** because the Mantine theme adapter painted `NumberInput` and `ColorInput` labels `textMuted`. Both are `text` now; the framework's labels already were.
- **The slider moved, as one slider.** A 14px thumb on `surface` with a 2px `primaryStroke` ring, the filled track `primaryStroke` and the rest `border`, recessed when disabled (rule 16) rather than faded. Its 20px row gained a band 2px above and below it as a pseudo-element, so the drag target is WCAG 2.2's 24px and no panel moves; the spec checks both edges land on the control and fails without the band. Mark labels were already centred on their values, and there are no dots. The spec reads the hit test after scrolling the slider into view, because `elementFromPoint` sees only the viewport.

### Pass 2: the fields (2026-10-26)

**Measured, not read.** The research pass left the label block unresolved, so a Mantine `NumberInput` was measured in the running settings drawer: a 36px input with 8px corners and 12px padding, a label row of 24.8px (set by the inherited 16px line box, not by the label), the description directly under it at 14.4px, then 5px to the input, and steppers 24px wide in two 17px halves with `tabIndex=-1` and `aria-hidden`. The framework's 19.6px label plus its 5px gap lands the input at 24.6px, so its gaps were kept and only the order changed; a described field is about 2px taller because the description keeps the type scale's 1.4 line height.

**What the designer decided, and what was built** (rule 19), each failing `e2e/control-parity.spec.ts` first:

- **Label, description, input, error.** The description moved above the input in the shared field shell and in `NumberInput`, which renders its own.
- **8px corners**, the same as the buttons, and the label at the field's size (12px at `xs`, 14px at `sm`), 500 and `text`. The input is padded a third of its height and takes the size's font, as Mantine's was.
- **Stacked steppers by default**, 17px at `xs` and 24px at `sm`, `textMuted` chevrons behind a `border` divider with a subtle icon button's hover, out of the tab order and hidden from assistive tech, since the arrow keys are the keyboard path. The flanking minus and plus are `controls="flank"`; `controls="none"` is Mantine's `hideControls`.
- **Disabled is recessed** by rule 16, steppers included, rather than faded.
- **One field look.** The codemod dropped `filled` from 29 fields. The builder's title is `variant="bare"`: no ground or edge at rest, both reserved so nothing moves, an edge on hover and the ordinary field once focused, which the spec checks for position as well as paint.

**A silent API gap.** `NumberInput` took no attributes beyond its props, and TypeScript accepts any hyphenated attribute on a component, so the `aria-label` on nine number fields and a test id on one would have vanished without a compile error. It now passes a named set of input attributes through to the input. `TextInput` gained `onClick`, `autoFocus` and `type="datetime-local"`, which call sites already passed.

**Two behaviour changes the first verification caught**, each with a unit test that failed first:

- **An explicit `aria-label` lost to the visible label.** Base UI's field links its input to the label with `aria-labelledby`, which outranks `aria-label`, so the media dialog's URL field, labelled "External URL" and named "External media URL", lost the more specific name and two end-to-end flows could not find it. Under Mantine the `aria-label` won; it wins again.
- **Number fields grouped their digits.** Base UI formats by locale, so a pixel width showed "1,200". Mantine showed plain digits unless asked, and so does the framework now.

Eight unit tests found a number field by its displayed value and now skip Base UI's `aria-hidden` twin input, which exists for form submission, while still requiring exactly one visible match.

**Field sections, caught by the captures.** The gallery's visitor-facing search showed its placeholder about 12px further in than Mantine's: the framework padded the section and the input both. A section is now a square the field's height wide and the input gives up its padding beside it, so the text starts 37px from the outer edge, as Mantine's did; the spec measures both sides.

**Disabled toggles follow rule 16 too.** A disabled switch or checkbox faded to 60%; it is now recessed like every other control, its label in `borderStrong`, and the spec checks off, on and checked on both defaults.

**Found in the designer's crop: the off switch has no visible thumb.** The thumb is `surface` on a `surface2` track, 1.02 to 1.23:1 across the 23 themes and ΔE00 0.75 on default-light, so an off switch reads as an empty outlined pill. Mantine drew a white thumb on a grey track. It went to the designer with a proposal rather than being changed here.

**The batch.** 138 codemod edits in 46 files, after the codemod learned to read `true` and `false` literals (it had reported `allowDecimal={false}` as "not false"). By hand: four sites carried Mantine's empty-string value for an empty number field through their own state and now carry `null`; the builder's layer rename keeps the row's 22px height by overriding the `xs` control height, in the size basis; the builder title, the layers search and the access-request form lost their `styles` overrides to the one look; and `SearchableEntityInput` lost `rightSectionPointerEvents`, so clicking its search icon no longer focuses the field. `UnitScrubField` keeps Mantine's `NumberInput`: it is the component the unit slot was built to replace, and its rewrite is P81-B's. The allow-list fell from 161 to 160.

### Pass 2: the fields' sign-off (2026-10-26)

The designer approved the fields and the slider. Two follow-ups, each failing `e2e/control-parity.spec.ts` first: an off switch's thumb is `textMuted`, so its position shows (5.27:1 on default-light, 6.88 on default-dark, and distinct from the `borderStrong` disabled thumb by ΔE00 11.4 and 17.8 in the designer's measurement); and the password reveal is the eye and eye-off in a 24px target, named "Show password" with `aria-pressed`. Rule 18 now specifies the switch's three states.

### A regression in locked chrome, found before the dialogs moved (2026-10-26)

**Moved controls painted the gallery's theme inside locked chrome.** The Settings drawer, the responsive config editor and the Layout Builder take the brand palette when chrome is locked, through `AdminChromeProvider`, which is a Mantine provider plus Mantine-only class and attribute plumbing. The framework controls moved in this track read the framework's tokens, which none of that sets, so from the buttons batch on, the drawer's Cancel and Save, its switches and its number fields painted the gallery's tokyo-night while the Mantine parts around them painted the brand. The `display settings dialog, chrome locked` capture compares at 10% and passed throughout. Found while planning the dialogs, by reading that capture rather than its result.

**The fix** is the framework's own mechanism: a nested `MullionProvider` with `mode` from the chrome setting, inside each Mantine container's title and body (it renders `display: contents`, so no layout moves). The config editor takes it through a `chromeMode` prop and a top-level `ChromeScope`, so the subtree never remounts. `theme-qa.spec.ts` gained an exact test: with a tokyo-night gallery and locked chrome, the drawer's Cancel button, its switch and its number field must resolve the brand's `surface`, and it failed on the button first. When these containers move to the framework themselves, the nested provider is how their own popups take the chrome's palette, and `AdminChromeProvider` goes with the last Mantine part inside them.

### The overlays, before they move (2026-10-26)

A research pass compared the overlay family with Mantine's stylesheet and the theme adapter. Its findings split in two. Differences of size, spacing and motion were fixed in the framework now. Differences of look went to the designer (`overlays-before-they-move-2026-10-26.md`), because some contradict what Phase 80 assumed: the framework's `overlay-bg` comment says the shipped scrim is black at 0.6 on every theme, which holds for the two drawers, but the adapter gives all 26 modals the theme's `background` at 0.75, a 1px border and a header divider. The menus' full-bleed rows with the rail are the designer's from 14 September and stay.

Fixed in the framework, each failing `e2e/control-parity.spec.ts` or `overlays.test.tsx` first:

- **A named size was a spacing step.** `Modal` and `Drawer` passed `size` through `spacingValue`, so `size="md"` was a 16px-wide dialog; 17 modals pass a name. A name is now one of Mantine's dialog widths, 320 to 780px, with 440 the default for both, where the framework had 416 and 352.
- **Placement.** A modal sits 5dvh from the top and at least 5vw from each side, and is not centred unless asked, as Mantine's was; 18 of the 26 modals relied on that. The header is at least 60px tall with the close button 5px nearer the edge.
- **Transitions users choose.** The Settings panel's animation (slide, fade, scale from the corner, none) and the campaign viewer's (pop, fade, slide up, with a duration) are user settings. A dialog now takes `transition` and `transitionDuration`, applied to its backdrop too, honours reduced motion, and calls `onExitTransitionEnd` once it has closed, through Base UI's `onOpenChangeComplete`.

The parity spec's `settle` now waits two frames and then for every shadow root's animations, since a dialog portals into the overlay root and a transition starts a frame after its starting style goes; without both, the widths read 97% of their value, mid-scale.

### Pass 2: the dialogs, built and then set aside (2026-10-26)

**Built in the framework and kept** (rule 20), each failing `e2e/control-parity.spec.ts` first: one backdrop token, `--mullion-backdrop`, black at 0.60 for modals and drawers alike (the engine's `overlay-bg` renamed, its opacity shared with the fixed caption scrim as `BLACK_SCRIM_OPACITY`, so "black over the page" is one number); a `raised-bd` edge on every dialog and none when full-screen; the medium shadow; a header divider only once the body has scrolled under it, on an edge reserved so nothing moves; and `scrollBody={false}` for content that scrolls itself, whose body then clips and drops its padding. `CloseButton` is now exported, and the codemod has rules for `Modal` and `Drawer`.

**The flip was set aside, by user decision (2026-10-26).** Moving `Modal` and `Drawer` (83 codemod edits in 27 files, with the Settings drawer, config editor, Layout Builder and campaign viewer by hand) passed typecheck and most tests, and the failures that remained showed the order was wrong. Base UI makes everything outside an open dialog inert and hidden, and every Mantine overlay still portals out of it: the builder's discard prompt (`modals.openConfirmModal`), the config editor's Reset menu, the viewer's in-context popover, and the builder's menus, popovers and selects. In the browser a pointer still reaches them; keyboard focus and a screen reader do not. So the overlays that open inside dialogs move first (menus, popovers, the select family, the colour input, tooltips and the imperative confirm), and the dialogs after them. The whole flip is saved as `~/project_bak/mullion-p81a-pixels/dialogs-flip-full.patch`, to reapply.

**What the attempt found, recorded for the reapply.**

- **Base UI stops the keys a dialog handles (Escape, the arrows) before they reach `document`**, so the Layout Builder's shortcuts, which listened on `document`, would all have died. The hook now listens on the builder's own dialog, which works for Mantine's dialog today, and its guard judges a key by the event's real origin (`composedPath()[0]`), because past a shadow root `target` is the host. It skips text fields and widgets that own the arrows; that closes the P80 follow-on about arrows in builder fields (Layout Builder row of the batch table above). Two tests cover the guard, and the arrow test fails on the old code.
- **The campaign viewer takes an "Edit campaign" action for admins** (user decision, 2026-10-26). Under Mantine an admin could open the floating Admin menu over the viewer and edit that campaign; a modal dialog rightly makes the page behind it unreachable, so the workflow moves into the viewer. Its placement goes to the designer when the dialogs return; two end-to-end flows change with it.
- **Harness changes the flip needs**, to reapply with it: test wrappers that mount only Mantine's provider need `MullionProvider`; a dialog portals into its provider's overlay root, so "inside the render tree" becomes "under a provider scope"; a dialog opened over another hides the lower one, so a role query finds only the top; one test file resets its module registry and needs the provider from the same copy of `@/ui`; and synthetic key events need `composed: true`.
- **The theme-qa focus-ring audit now paces its Tab presses**, as `ui-overlays.spec.ts` does: Base UI contains focus by redirecting from a guard over a frame or two, which back-to-back presses outrun.

**The designer's crop** was captured from the current tree and from a worktree at the commit before, on the same light-theme page with three photo campaigns and the viewer open; it is in the correspondence folder as the preview of what the dialogs will change.

### The campaign viewer's admin affordances, ahead of the dialogs (2026-10-26)

The designer placed the viewer's new admin action and settled the details the crop showed (rule 21). Built now, under Mantine's dialog, each failing a new `theme-qa.spec.ts` test first:

- **"Edit campaign"** is a subtle text button with a pencil on the title's meta line, admin-only, calling the campaign context's `onEditCampaign`; with the cover hidden there is no meta line, so it leads the content instead.
- **The cover gear** moved out of the top-left corner it shared with the company badge into a row after it, `xs` apart, so it can no longer overlap the badge.
- **The close button** is black at 0.60, stepping to 0.75 on hover, through a class rather than Mantine's inline `styles`, which cannot express hover.
- **A 24px target for small icon buttons, in the framework.** The 36px gear inside Mantine's dialog was not Mantine's sizing: `global.scss` gave every `button` in the gallery root a 36px minimum (44px on phones), a pre-framework touch-target rule that turned every 18 and 22px framework icon button in the gallery into a 36px one. The rule now skips framework controls (`:not([data-mullion-focus])`), and the framework gives its `xs` and `sm` icon buttons a band out to 24px instead, measured from outside their 1px border; `control-parity.spec.ts` checks the band reaches 24px and no further. The close button keeps its pseudo-elements for its cross and is not banded at those sizes.
- **One new string**, "Edit campaign", harvested and translated in all five locales from the existing "Edit Campaign".

**For the dialogs' return, added to the reapply:** the floating Admin button sits under the backdrop, with a test that nothing outside the top dialog paints above `--mullion-backdrop`; Escape closes only the editor over the viewer and focus returns to "Edit campaign" (a `test.fixme` in `theme-qa.spec.ts` until then, since Mantine closes every modal on Escape); and the patch's campaign viewer close button takes the same `.close` class.

### Pass 2: menus, popovers and the imperative managers (2026-10-26)

The overlays that open inside dialogs move before the dialogs (user decision above). This batch takes menus, popovers, and the two imperative stores; tooltips and the select family follow.

**Framework parity first**, each failing `control-parity.spec.ts` first: menus and popovers sit 8px from their trigger and tooltips 5px, as Mantine's; a popover is padded 12 by 16; a tooltip has 8px corners (rule 20). Triggers now pass through the props and ref a wrapper puts on them: a Mantine tooltip wrapped around a framework trigger hands it handlers and a ref, which the trigger had dropped, so the tooltip could never open. `Popover` gained `keepMounted`, which the builder's history list relies on, and its content takes `onClick`.

**The compound overlays** differ from Mantine's in shape, so `scripts/ui-codemod-overlays.mjs` reshapes them: the root's `position` and `width` move onto `Menu.Content` or `Popover.Content` as `side`, `align` and `width`; `Menu.Target`'s child becomes the trigger's `render`, keeping its children; `Dropdown` becomes `Content`; arrows, shadows and `withinPortal` go (rule 20, and popups mount in their trigger's root); `onOpen` and `onClose` fold into `onChange`; a red item is `danger`. 102 edits in 13 files, and the pass-2 codemod moved the imports. By hand: two triggers that toggled their popover themselves (Base UI's trigger now toggles, so they would have double-toggled), a tooltip that had become the trigger instead of wrapping it, the usage badge as a non-button trigger (`nativeButton={false}`), and two `styles` objects moved onto the content.

**The imperative stores** (the P81-B item filed 2026-10-02): `notifications.show`, `notifications.hide` and `showNotification` became `notify`, and `modals.openConfirmModal` became `confirm`, across 23 files, by renaming the callee, as Phase 80 designed. `ContextualToolbar`'s rename prompt, the one `modals.open`, is a dialog with local state. `main.tsx` and the two wp-admin apps mount the framework's `Notifications` and `Confirmations`, which are page singletons themselves, so `usePageHost('mantine-managers')` is gone, as are Mantine's notification stylesheet and every `@mantine/modals` and `@mantine/notifications` import outside the barrel. `useBroadcastStaleness` passes `autoClose: 0`, which `notify` reads as "keep it up" (the framework test `autoClose=0 keeps the toast up`), so its warning no longer vanishes on the next tick. Two local names collided with the new imports and were renamed (`notifyMessage` in the wp-admin apps, `confirmLabel` in `useAccessRows`). The toast region's name is a new string, "Notifications", translated in all five locales.

**Harness.** Ten test files mocked `@mantine/notifications` and `@mantine/modals`; they now mock `notify` and `confirm` on a partial `@/ui`. The shared render helper and the keyboard-shortcut wrapper mount the framework hosts, and the global teardown closes every confirm and clears every toast: the stores are module-wide, and a confirm one test left open made the next test's page inert. `NotificationsMount.test.tsx` tested Mantine's notification host and is removed; the framework's own manager tests and `ui-managers.spec.ts` cover the replacement.

**A flake to watch.** In one full run, `portal-mode.spec.ts`'s drawer test timed out clicking the Admin menu's Settings item, intercepted by the hostile fixture's sticky header while the newly framework menu was still settling. It passed in the same run's re-run and in four further runs alone. If it recurs, the test should wait for the menu to finish positioning before clicking. The allow-list fell from 160 to 141.

### Pass 2: tooltips (2026-10-26)

**The trigger is the child.** The framework tooltip wrapped its child in a span, while Mantine made the child itself the trigger. A wrapping box changes the layout of a full-width or absolutely positioned child, and anchors the tooltip to the box rather than the control. All 115 call sites wrap one element that takes a ref (Mantine required it), so the framework now renders that element as the trigger through Base UI's `render`, and wraps only text or several nodes in a span (`overlays.test.tsx`, red first). The pass-2 codemod renames `position` to `side` and drops `withArrow` (rule 20) and `multiline`, since the framework tooltip wraps at 288px by itself: 91 edits in 32 files.

**The 22 tooltips that carried information** (P80-F item 10, listed under P81-B) each have their own channel now:

| Kind | Where | Channel |
|------|-------|---------|
| No name | The media tab's three view-mode segments | Each segment has an `aria-label`; the framework segmented control gained one per segment |
| Explanation behind a focusable icon | The slot and mask properties' info buttons | A popover that opens on click |
| Explanation behind a focusable icon | The design assets' tag button | The current tags follow its name |
| Reason on a disabled control | "Pick a space first" on New campaign and Import | Shown as text beside them while all spaces are selected |
| Extra detail on a visible-text control | Permanently delete (mobile list and table), the exclusive-only switch | Folded into the name, which keeps the visible text (WCAG 2.5.3) |
| Extra detail on a visible-text control | Fit to viewport or canvas | The explanation is the button's description; its name is now its visible text |
| On a non-focusable element | Custom gallery icon (mobile list) | Its summary is in the icon's name |
| On a non-focusable element | Grant and pending counts, access source, role and expiry badges | The text is inside the element, visually hidden |
| On a non-focusable element | "Click to select" on the reset link field | The field's description |
| Shortcut hint | 26 controls in the builder and the admin toolbar | `aria-keyshortcuts`, Control and Meta both listed where the hint says Ctrl |
| Transient feedback | "Copied!" on the webhook secret | A polite live region beside the button |

Two of the 22 had been fixed in passing since the classification: the mobile list's grant badge reads "3 grants", and the Move button's name already says "to another space".

Three of the new names are new strings rather than two translations joined with a colon, which a translator could not reorder: "Permanently delete {{title}}", the exclusive-only switch's name, and the tag button's name with its tags, each translated in all five locales. `BuilderHistory.test.tsx` mounted only Mantine's provider, which the framework tooltip needs; it mounts both now.

**Validation.** Typecheck, lint, the allow-list (141 to 137) and both i18n checks clean. The full unit run had 4488 passing and 6 failing, all in `BuilderHistory.test.tsx` for the missing provider; with it, the file's 24 pass, and the files beside every renamed name pass after the string change (153 tests). The theme captures match the last batch's (16 compared, 0 differ), and the full e2e run passes (241, one skipped).

### Pass 2: the select family and the colour field (2026-10-26)

This batch moves `Select`, `MultiSelect`, `TagsInput`, `ColorInput` and `ColorSwatch` onto the framework, and replaces the two search fields built on Mantine's low-level `Combobox`. It carries the keyboard fix Phase 80 deferred: every Mantine dropdown put its list in the overlay root's shadow tree, where the trigger's `aria-controls` and `aria-activedescendant` named nothing, so no select in the shipped configuration could be operated by keyboard. The framework's lists mount in their trigger's own root (P80-B).

**The framework's own control names are translated.** A clear button, a chip's remove control, the colour surface and its position, the password reveal and the number steppers are named by the framework, and those names were English in every locale (the password and number fields since their batch). `MullionProvider` takes a `labels` set, merged over its parent's so nested providers inherit it; `src/frameworkLabels.ts` builds it from the catalogue and the three root providers pass it. A component's own label prop still wins. Templates keep the framework's single-brace slots by interpolating each slot with itself. Seventeen new keys: twelve are new strings translated in all five locales, and five reuse existing translations ("Hue", "Opacity", "Pagination", "Previous page", "Next page"); the close button reuses the existing "Close" key. The English defaults now spell "color" as the product does, and the surface's position reads "Saturation 95%, brightness 80%".

**What the call sites needed from the framework**, each tested before the flip:

- `renderOption` on `Select`, for the theme picker's swatches and descriptions and the adapter picker's capabilities. It draws the option's content and keeps the check mark, which is how selection is shown; the closed field still reads the label.
- `clearable` on `MultiSelect` and `TagsInput`, through Base UI's clear part, and `splitChars` on `TagsInput`: everything before a split character becomes a tag, duplicates and blanks are dropped, and the tail stays typed, so a pasted `a, b, c` arrives as three tags.
- **`Autocomplete`**, a fourth form on Base UI's: free text with suggestions, where choosing an option fills in its label and reports its value through `onOptionSubmit`. The user search and the company picker need exactly this, an identity behind free text. The text change is reported first and the choice second, which both call sites depend on (the user search clears its selection on a text change). Base UI runs an item's own click handler before its commit, so the choice is reported a microtask later; a press begun elsewhere and released on an option is covered too, as Base UI covers it.

**Defects found and fixed in the framework on the way:**

- **A plain select's label pointed at nothing.** Base UI's field aimed the label's `for` at an id no element had, so clicking "Role" did nothing and a label query found no control. The label now names the trigger (`select.test.tsx`, red first).
- **Two rings on a focused select.** The trigger and the search input carried the inset ring marker, and `focus.css`, registered last, beat the field rule that suppresses the input's own ring, so each drew a ring inside the field's. The suppression now includes the row in its selector. `ui-selects.spec.ts` checks one ring, on the field, for both forms, red first.
- **A list that did not line up with its field.** Lists were anchored to the control inside the field's border and centred on it, so a list was 2px narrower than its field, with the fields underneath showing a sliver of edge at its left, and a list wider than its field hung 4px left of it. Lists now anchor to the field's row and start-align. `ui-selects.spec.ts` checks the left edge and the width for both forms, red first.
- **A blank band at the top of a search list.** Base UI keeps the empty message mounted while there are options, as a live region, and its padding showed. An empty one now has none, and stays in the tree.
- **The colour picker repainted every display swatch.** Its swatch buttons shared `.mullion-color-swatch` with `ColorSwatch`, and its later sheet turned every display swatch into a 20px checkerboard. The picker's classes are renamed, and `componentSheets.test.ts` now fails when two sheets declare the same bare class (red against the old sheet).
- **The colour field's label was nested in another label**, the P80-F defect fixed in the chip field and missed here. It points at its input by id now.
- **24px targets (rule 21):** the clear and chevron buttons are at least 24px wide, since the field row clips anything outside it; the chip remove control, the colour swatch, its picker swatches and the dropper get bands out to 24px.

**The flip.** The pass-2 codemod gained rules for the five names: `comboboxProps` loses `withinPortal` and keeps a width as the framework's `width`; `allowDeselect={false}` states the framework's only behaviour; `withCheckIcon` goes; `searchable` on a `MultiSelect` goes, since it always takes typing; `variant="filled"` goes, per the one-field-look decision. 91 edits in 29 files. `ModalSelect` and `ModalColorInput` existed only to keep Mantine's dropdown inside the tree, which the framework always does; they and their tests are gone, and their 13 callers import the framework names. By hand: the theme selector's portal override, two status selects' `styles` (now `style`), the builder's three filled colour fields (behind `BuilderColorInput`, which the codemod cannot see), and the size types that named Mantine's. `SearchableEntityInput` takes its options as data, with a renderer and an empty message, instead of Mantine option elements; the company picker and the access tab's user search pass them. `UnitScrubField` keeps Mantine's `Select` until P81-B rewrites it onto the unit slot with the Typography redesign; the codemod lists it rather than skipping it silently. `Combobox` and `useCombobox` leave the barrel.

**Behaviour that changes for users:**

- Clicking the chosen option no longer clears a select. Mantine did that unless a call site turned it off, as 20 did; a field that may be empty has a clear button.
- Every select shows a check on the chosen option, including the two table selects that hid it.
- The search fields' lists open on click, typing or the arrow keys, not on focus, so tabbing through a form does not open each one.

**Proved in the shipped configuration.** `portal-mode.spec.ts` now opens the Settings drawer under the hostile host in overlay-root mode, finds its first select, opens it with ArrowDown, checks that `aria-controls` resolves in the trigger's own root, commits an option with End or Home and Enter, and checks focus returns. Before this batch no select in the drawer could do that. Probed in the running app too: the theme list with its swatches, and the user search driven by the keyboard to a selection.

**Harness.** 37 tests in ten files drove Mantine's select through its hidden input: they read the chosen label as an input value, found it by `{ selector: 'input' }`, and opened it and picked with `fireEvent.click`. A bare click opens a plain framework select but commits nothing, and does not open a searchable one, so `src/test/test-utils.tsx` gained `pickOption`, which goes through user-event, and `shownOption`, which reads what a select shows. Both find the control by exact name, inside a collapsed section too, as the label query did. The `ModalSelect`, `ModalColorInput` and `ThemeSelector` tests that asserted Mantine's portal flag are replaced by the framework's root assertion, and `BuilderColorInput`'s tests hold the value in a parent, since the framework field is properly controlled (Mantine's kept its own copy of the typed text).

**A slip of this batch, caught by the captures.** The autocomplete's rows have no check column, and the first rule that let their text take the row matched `.mullion-select-item-text:only-child`. Base UI unmounts the check on every row but the chosen one, so that rule also moved every unchosen row of every select 26px left of the chosen one. The rows are marked explicitly now (`data-uncheckable`), and `ui-selects.spec.ts` checks that every option's text starts at the same edge, red against the slip.

**The browser suites.** `theme-qa.spec.ts`'s two theme tests read the select's text rather than an input's value. Its tight-tolerance snapshot captures the field's row, since the framework trigger sits inside the row's border and a capture of the trigger alone lost the edge it exists to pin; rebaselined, at 534 by 37 as before. `style-delivery.spec.ts`'s P77-C test now checks the framework's chosen row inside the overlay root: `primary-text`, resolved through a probe with a sentinel fallback so a missing token cannot pass, and the check mark. Mantine's checked-option rule stays for the unit picker until it moves.

**A note on Base UI's combobox:** while a typeable combobox's list is open, Base UI hides everything outside the input and the list from assistive technology (Floating UI's `markOthers`), including the field's own chips; chips added after it opened escape the marking. That is the primitive's design, and the split-character test reads the chips with `hidden` for it.

**Validation.** Typecheck, lint, the allow-list (137 to 119) and both i18n checks clean. The full unit run passes (4516 tests); the first full run had 37 failures in ten files, all the harness changes above. The theme captures differ from the last batch's in 10 of 16, every one the theme field, its list, or the panel below them moving with the field spacing (`select-fields-before-after-2026-10-26.png` in the designer's folder). The full e2e run passes (247, one skipped). Questions to the designer in `selects-built-2026-10-26.md`: the list's alignment when wider than its field, the search rows' missing check column, white swatches on a light list, and the 24px minimum widening the smallest selects' chevron area.

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

**The Settings batch also carries a live clipping defect, reported by the user on 2026-09-14.** The Settings panel is cut off on its right-hand side by roughly 20px, obscuring the right edge of the fields, the column headings and the panel's own edge. Not yet diagnosed: a static read rules out `adminChromeStyles`, which contributes only custom properties and no width, so the cause is in the drawer's own box rather than in the shared chrome helper. The two candidates worth measuring first are the `body: { overflow: 'hidden' }` style in `SettingsPanel.tsx`, which clips anything wider than the drawer content rather than scrolling it, and the scroll `Box` inside it, whose `overflowY: 'auto'` makes `overflow-x` compute to `auto` as well and whose scrollbar eats inner width that fixed-width children do not give back. Diagnose it in a browser by comparing the content box, the inner box and the viewport; do not fix it from a source read. **A lead, from P80-G's pixel review on 2026-10-07:** every `theme-qa` snapshot of the open Settings drawer had drifted about 41,000 pixels from its 2026-09-09 baseline, and the diff is the whole drawer content shifted sideways by a few pixels. The 10% tolerance hid it; P80-F's `main.tsx` change was ruled out by rendering without it. The baselines were regenerated in P80-G, so the shift is now the baseline, and the drift came in somewhere between P77-C and P80. **A second finding in the same suite:** `theme selector dropdown — default-dark` is non-deterministic, rendering one of two layouts 3px apart; two runs of identical code differed by 53,589 pixels. The 10% tolerance lets it pass either way, which is also why it went unseen. Make it deterministic when this batch touches the drawer, because a snapshot that flips cannot catch a real change. It is filed here rather than as a Phase 80 track because the panel is a consumer surface and Key Decision B forbids Phase 80 touching one, and because this batch rewrites these exact files anyway.

**The select family carries a live accessibility defect that this track fixes, and it is the reason the Settings batch cannot slip quietly.** Confirmed 2026-09-14: `use-combobox` resolves `const root = getRootElement(targetRef.current)` from the **trigger** and finds the active option with `findElementBySelector('#listId [data-combobox-active]', root)`. The shipped portal default puts the dropdown in the overlay root, a *different* shadow root, so the lookup returns null and arrow keys do nothing. `Select`, `Autocomplete`, `MultiSelect`, `TagsInput` and `TreeSelect` are all keyboard-inoperable today, across 26 files, which is a WCAG 2.1.1 failure on every dropdown in the product. Proved by `?portal=shadow`, which restores it; `?portal=document` does not, because `document.querySelector` does not pierce the overlay root either. The user chose on 2026-09-14 to fix it here rather than re-plumb Mantine portals this phase deletes.

**The binding constraint that follows: a listbox must live in its trigger's root.** Base UI uses ID-referenced ARIA the same way Mantine does, so migrating onto the framework's own `Select` does **not** fix this by itself — it reproduces it unless the popup stays in the trigger's tree. Verify the keyboard contract on a shadow-mounted gallery before the batch is called done, not after.

**Status, 2026-10-26.** Fixed for every select but one by P81-A's select batch (pass 2): the lists mount in their trigger's root, and `portal-mode.spec.ts` drives a Settings drawer select by keyboard in overlay-root mode under the hostile host. The exception is `UnitScrubField`'s unit picker, still Mantine's until this track's Typography redesign rewrites it onto the unit slot. Still to do for the acceptance criterion: hear the active option announced by a real screen reader, which no automated check here does.

**The notification and confirmation call sites (filed 2026-10-02).** 42 `notifications.show` calls in 16 files become `notify.show`, and 6 `modals.openConfirmModal` sites become `confirm`, by renaming the callee (Phase 80 Key Decision E). Three things ride along:

- **`useBroadcastStaleness` stops dismissing its own warning.** It passes `autoClose: 0`, which Mantine reads as a zero-length timer, so the "Template updated in another tab" warning, whose message tells the user to close and reopen the tab, disappears on the next tick. `notify` reads `0` as "keep it up", so the rename fixes it. The user chose on 2026-10-02 to let this phase fix it rather than patch Mantine first; it is named here so the fix is verified rather than assumed.
- **`ContextualToolbar` stops using `modals.open` and `modals.closeAll`.** It raises a rename form imperatively, which `confirm()` does not cover and should not. Render it as a `<Modal>` with local state.
- **The hosts: settled by P80-F on 2026-10-02.** Both framework hosts are page singletons: mount `<Notifications label={t(...)}>` and `<Confirmations />` in each gallery's tree if that is convenient, and only the first mounted renders, with the next taking over if it unmounts. P80-F also fixed today's Mantine hosts, which rendered every toast and opened every confirm once per gallery (confirming both ran the action twice, reproduced on a two-gallery page): `main.tsx` now renders them beside the app, in the first gallery only, behind `usePageHost('mantine-managers')`. When the sites move, replace those two lines with the framework hosts and delete that call. `e2e/ui-managers.spec.ts` asserts the two-gallery case for the framework hosts.

**What each batch carries from Phase 80 (filed 2026-10-02).** Phase 80 found these while building the components; each lives on a surface a batch below rewrites anyway, so each is fixed in that batch rather than patched first and migrated second.

| Batch | Item | Source |
|-------|------|--------|
| Settings | The panel is clipped about 20px on the right (above). | User report, 2026-09-14 |
| Settings | `Show Title` and `Show Subtitle` in the Typography panel lose the focus ring's left edge. Same class as the menu row: a 6px outset ring inside a container that clips. Fix with the redesign the batch already carries. | P80 follow-on; held for this phase by user decision 2026-09-14 |
| Layout Builder | ~~`useLayoutBuilderKeyboardHandlers` handles ArrowUp and ArrowDown on `document` with no guard for an event from an `input`, `textarea` or `contenteditable`, so typing in any builder field moves the selected slots.~~ **Done 2026-10-26 (P81-A):** the guard reads the event's real origin and skips fields and arrow-owning widgets. | P80 follow-on |
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

Strip the `--mantine-*` fallbacks P81-A's pass 1 wrote into inline styles (`var(--mullion-spacing-sm, var(--mantine-spacing-sm))` becomes `var(--mullion-spacing-sm)`), once the wp-admin apps have a provider. A grep for `var(--mantine-` outside `src/themes/` finds them, along with 146 direct `--mantine-*` reads in `.tsx` files that predate this phase and need tokens chosen by hand.

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

## Track P81-F - The size basis

### Problem

Every framework token is a rem value from `_base.json`, and so is every Mantine token, and `rem` resolves against `<html>` however deep the shadow root is. A WordPress theme that sets `html { font-size: 62.5% }` therefore shrinks the whole product to 62.5% of its design size: menus, inputs, the focus ring's reach, the badge glyphs. Measured on 2026-10-25 by mounting the dev page at both roots and reading bounding rectangles: a `Stack` at `lg` went from 20px to 12.5px, a `Group` at `md` from 16 to 10, at `xs` from 10 to 6.25. Nothing sets `--mantine-scale`, and the framework has no scale of its own.

Found while answering P81-A's question about numbers. The designer's reply (`docs/design/correspondences/designer-answers-ui-scale-mapping-2026-10-25.md`, section 1) sets the invariant: one token step is the same physical size on every host, and numbers are read in the same basis as tokens.

### Fix

The provider measures the document's root font size at mount and sets a scale on its scope that brings one step back to design size, and the token sheet multiplies every rem token by it, as Mantine's `rem() * var(--mantine-scale)` does. Until P81-D removes Mantine, the same value goes to `--mantine-scale`, so both libraries keep agreeing (P81-A's pass 1 relies on that). Open points to settle in the track: whether to re-measure when the root changes after mount, and whether the wp-admin apps need it at all. The second was settled on 2026-10-26: wp-admin's root measures 16px, so its scale is 1.

### Implementation (2026-10-25)

**Priority.** The designer called this a shipping defect rather than a sequencing item (`designer-answers-scale-data-2026-10-25.md`, section 1): every install on a theme that sets its root to 62.5% shows the gallery at 62.5% of its design size today. It also cannot move a colour, so it shipped ahead of the rest of the phase.

**The scale is the user's default font size over the root's, not 16 over the root's.** `measureRootScale()` reads a probe at `font-size: medium !important`, which resolves to the browser's default whatever the host's stylesheets say, against `<html>`'s computed size. On a host that leaves the root alone the result is exactly 1, so nothing moves, and a reader who raised their browser's default keeps that preference; only the host's override is cancelled. One measurement per page, shared by every provider through `useRootScale()`, repeated on `resize` (a root that follows a media query) and on `load` (a late stylesheet).

**One multiplier, four routes.** Rem lengths live in four places, and each needed its own route to the same variable:

| Where | Count | Route |
|---|---|---|
| Theme tokens (spacing, radius, type and heading scales, control heights) | every rem the engine emits | `scaleRem` at the end of `generateCssVariables`, so a theme or `defineTheme` override is covered without a list to maintain |
| Stylesheets under `src/` and dockview's | 66 framework, 90 app, 11 dockview | a PostCSS step in `vite.config.ts`; Mantine's sheet is excluded because it already multiplies by `--mantine-scale` |
| Inline styles | 165 literals in 45 files, 4 template strings | `uiRem(n)` from `@/ui`; `packages/shared-ui` cannot import `@/ui`, so its 7 carry the `calc()` literally until batch zero dissolves the package |
| Mantine | its 650 `var(--mantine-scale)` uses, plus the theme's own rems | `theme.scale` in `main.tsx`, and the adapter multiplies the rems it hands Mantine by `--mantine-scale` |

`--mullion-scale` is declared on each scope beside the tokens that read it, in the token sheet. Outside a provider every route falls back to 1, so the wp-admin apps read plain rem, as before, until P81-B gives them a provider; their root size was not measured, and does not need to be until then.

**`scale.ts` now reads numbers as sixteenths of a design rem, and rem strings in the basis.** That was P81-A's open discrepancy, settled by the designer as "read numbers the way Mantine does, because that is the way the tokens are read". A rem inside a string prop (`paddingInline="1rem"`) takes the scale too, so a caller cannot opt a value out of the basis by spelling it.

**How it was verified.** `e2e/size-basis.spec.ts` serves the dev page with `html { font-size: 62.5% }` injected into `<head>`, where a theme's stylesheet puts it, asserts the root really measures 10px, and compares bounding rectangles against a 16px root: the framework showcase in shadow and light mounts (stack and group gaps, button, action icon and chip heights) and the product gallery (Mantine group and stack gaps, button and chip heights). Before the fix it failed on every box, a 36px button measuring 22.5. The first draft of the spec passed before any fix, because an init script sets the font size on a document element the parser then replaces; the root-size assertion is what keeps that from recurring. The chip's height comes from rem literals in `control.css`, and with the PostCSS step removed the two showcase cases fail on it, so the build-time route is proved, not assumed. At a 16px root, two exact `theme-qa` captures against the original "before" set: one matched on all 16, the other differed by 28 pixels at the corners of the open popup in `theme-selector-open-default-dark`, the snapshot already known to flip. Lint, typecheck, the allow-list check, `npm run build`, vitest (278 files) and the full Playwright suite pass. The tests that changed pinned raw rem text and now pin the scaled form: the engine's type-scale tests, the adapter's size tests, the layout and overlay number readings, two `select.css` sheet assertions, the carousel viewport strings, and the showcase's token-to-pixel check, which now reads the rem out of the `calc()`.

**Left for later.** Lengths a user types into the settings in rem (the unit pickers in the Settings panel offer `rem` for radii, heights, spacing and offsets, emitted raw by `toCss()` in `shared-utils`) are content, not tokens, and still resolve against the host's root. Whether they should follow the basis is a question for the designer, filed under Follow-On Candidates.

### Acceptance criteria

- On a page with `html { font-size: 62.5% }`, a token gap, a field's height and the focus ring's reach measure the same as on a 16px root, in both shadow and light mounts.
- A pass-1 inline style (`0.25rem`) and a token gap scale together, so P81-A's numbers stay in the tokens' basis.
- An e2e test mounts at both roots and compares bounding rectangles.

### Validation

- The new e2e test, the full suites, and the exact `theme-qa` diff at a 16px root, which must not move.

---

## Track P81-E - Small defects found during Phase 80's audit

### Problem

The user's partial pass of `ACCESSIBILITY_MANUAL_AUDIT.md` on 2026-10-25, and the work of seeding a site for it, turned up defects in today's product. Each is small. None is a framework defect, so none belonged in Phase 80.

| Defect | What is known |
|---|---|
| **`&` arrives as `&#038;` in interface strings** ("Open Mode &#038; Sizing" in the Settings panel) | Cause found. `class-mullion-embed.php` prints the `window.__MULLION_I18N__` script inline in the shortcode's output, and on a block theme the shortcode block runs before WordPress's `the_content` filters, so `convert_chars` rewrites every bare `&` in it. Confirmed on wordpress.lan's home page. It probably reaches every string with an ampersand, in every locale, and any `&` in the config payload. |
| **The admin menu flickers indefinitely at 320px** | Reported in Brave on Windows with the menu open. Not reproduced in headless Chromium, logged in, menu open or closed: zero DOM mutations over three seconds. The user's screenshot shows a classic vertical scrollbar, which headless Chromium does not draw, so the leading hypothesis is a loop: the open popup toggles the scrollbar, the viewport width changes, the popup repositions, and so on. |
| **NVDA reads list items twice** in the Admin Panel's and the Settings panel's category lists | Observed in NVDA's Speech viewer as two entries per item, the first cut off after its first word. It may be NVDA's own behaviour or our markup; inspect the accessibility tree of both lists first. |
| **Alt text is lost on campaign export and import** | The gallery's alt text is each media item's `caption`, and neither the JSON nor the ZIP export writes it, nor does `Mullion_Campaign_IO::import_entry` read it. A round trip silently drops every image's alt text. |
| **The gallery ignores WordPress's attachment alt text** | Alt is `caption`, falling back to `title`. Alt text set in the Media Library never reaches the gallery. Decide whether an upload's caption defaults from the attachment's alt, or alt becomes its own field. |
| **Most `wp mullion` subcommands are unreachable** | `@subcommand campaign list` and its siblings contain a space, which WP-CLI does not support, so each group collapses to its last registered command. `campaign list`, `archive`, `restore`, `duplicate`, `export` and `media list` cannot be run, and the documented `wp mullion campaign import file.zip` reads the word `import` as the file name. |
| **The Default space's badge reads `{{NAME}} (DEFAULT)`** in wp-admin's Gallery Spaces table | Cause found 2026-10-26. One key, `admin_space_default`, has two meanings: `AdminPanel.tsx:202` uses it as "{{name}} (default)" with a `name`, `SpaceManagementView.tsx:339` as plain "default" without one. The generated catalogue keeps the first, so the badge prints the raw placeholder. Since P60-I. Give the badge its own key. |
| **Three layout faults in the Settings and Admin panels** | The `px` unit slot spills out of its number field (Campaign Viewer, Fullscreen Content Max Width); a wrapped label ("Desktop Image Gallery Adapter") pushes its select out of line with its neighbour in Per-Type Breakpoint Adapters; and `Add Media` is filled and flush, already in P81-B's carried table. |

### Fix

- **The ampersand:** encode the inline payloads with `JSON_HEX_AMP | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT`, so they contain nothing a content filter rewrites and no `</script>`. A PHP test renders the shortcode through `the_content` and asserts the string survives.
- **The flicker:** reproduce with classic scrollbars, in Brave or Chrome on Windows, or by forcing them, before changing anything. Then stop the loop, likely with `scrollbar-gutter: stable` or by keeping the popup from changing the document's overflow.
- **The doubled list items:** compare the accessibility tree of both category lists with NVDA's output, and fix our markup if it is the cause; otherwise record it as an NVDA behaviour.
- **Alt text on export and import:** carry `caption` both ways, with a round-trip test.
- **The attachment alt:** a decision for the user, then the change.
- **The CLI:** register each group's commands as real subcommands (a `Mullion_CLI_Campaign` class per group, or the `campaign` command dispatching on its first argument), with a test that runs each documented example.
- **The layout faults:** fix with the P81-B surfaces they sit on, if that batch lands first; otherwise here.

### Acceptance criteria

- Every defect in the table is fixed, or decided and recorded, with a test where one can prove it.
- `wp help mullion campaign` lists every campaign command, and each documented example runs.

### Validation

- The new PHP and browser tests, the full suites, and a re-check of the ampersand and the flicker on wordpress.lan.

---

## Follow-On Candidates

| Candidate | Why it is deferred |
|-----------|--------------------|
| Publishing `@mullion/ui` | A product decision, and it converts an internal API into a public commitment. Worth deciding after the framework has shipped in the product, not before. |
| Dropping `@mantine/dates` | Listed in Phase 80's follow-ons; confirm it is genuinely unused before removing. |
| The visitor lightbox, reviewed whole | The designer's request, 2026-10-26: the one surface a site's visitors see, built from `Select` and the dialogs, so it is reviewed once their flips land rather than twice. |
| The media picker's "already added" tile | `MediaLibraryPicker.tsx` fades a tile that is already in the campaign to 50% opacity. It is out of the tab order, so it is not the focus bug rule 16 names, but it is a disabled state drawn with opacity. The designer's answer (2026-10-26) is neither: a photo wants a non-colour mark, a check or an "Added" label on a scrim (rule 15), because opacity on an image is a composite nobody audited. It lands with the media picker's batch. |
| Small field differences left after the fields batch | Mantine's label row is 24.8px at every size because the inherited 16px line box sets it, so an `xs` framework field sits about 3px tighter, which suits the dense panels. The textarea keeps the framework's padding where Mantine's was 4.5 and 5.5px at `xs` and `sm`. The designer accepted both as they are (2026-10-26). ~~The password reveal~~ **done**: eye and eye-off icons, "Show password" with `aria-pressed`, in a 24px target, since a control inside a field has no spacing exception. |
| Clicking a field's section focuses the field | Mantine laid sections over the input with `pointer-events: none`, so clicking a decorative icon focused the field; `SearchableEntityInput` relied on it. The framework's sections sit beside the input, so the click lands on the row. A row-level handler that focuses the input when the click is not on an interactive element would restore it everywhere. |
| User-entered rem lengths and the size basis | P81-F put every rem the product owns on one basis, but a value a user picks in rem in the Settings panel goes out through `toCss()` in `shared-utils` as plain rem and still shrinks with a host's 62.5% root. Whether a user's `1rem` means a design rem is the designer's call; if it does, `toCss()` emits it through the same multiplier. |
| ~~Row-selection keyboard support in `Table`~~ | **Moved into P81-B 2026-10-02.** The gap is `SpaceManagementView`'s `<tr onClick>`, and migrating that screen while keeping it would fail this phase's own per-batch keyboard pass. Only the keyboard fix moved; the screen's wider UX pass stays in FUTURE_TASKS. |

## Implementation Notes

_None yet, phase is Planned._

## Outcome

_Pending._
