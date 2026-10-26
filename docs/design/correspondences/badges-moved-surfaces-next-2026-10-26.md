# Badges and the scrim are built; one question before surfaces go onto the ladder

**2026-10-26.** Follows `designer-answers-badges-scrim-2026-10-26.md`.

Everything in your reply is built. Three things turned out differently from what I told you, and one question decides how rule 13 is applied to `Paper` and `Card`.

---

## 1. What landed

**The themed scrim is derived per theme**, floored at 0.60, as one token, `--mullion-caption-scrim`. On the bundled themes it runs 60% to 81%; the text audit reads the token, so a theme that overrides it below its need fails (checked on Latte at 60%). Rule 14 in `COLOR-SPEC.md` now says this.

**Badges moved by your split.** Fifteen states have their tone and glyph, the active-filter count is `primary`, the pending-request count is a state, and everything else is the neutral badge. Variants stayed as they were per site, with Mantine's defaults written out where a site left them. Your one-line rule for counts decided one site I had not listed: the media usage badge reads "Unused" (red today) or "3 campaigns" (blue). "Unused" is an urgent state and now takes `danger`; the count is neutral. Tell me if "Unused" should be `warning` instead; it is a nudge more than an error.

**The slot-number badge** keeps the overlay rule, on its surface's batch, as you said.

## 2. Three corrections

**The visitor lightbox's caption does sit on the image.** You took its ground to be the 93% backdrop, because the caption is placed below the image. I measured it on the dev site: at 1280 by 800 the caption block overlaps the image's band by 39px. With the test photo the text happened to sit left of the image, but a wide image at the 90vw cap starts 64px from the edge, under any caption, and site owners can raise the 85vh cap. So it took the black scrim, rule 14's untheme'd case, and its `gray.4` counter took white, since muted never goes on a scrim. Both fixed overlays are audit rows now: white on the black scrim over the worst photo (5.74), and white on the 93% backdrop over the worst page. A guard fails the build if the components stop painting those opacities.

**The space badges' colour was not the user's data.** I told you it was. `spaceColor()` hashes the gallery instance's id onto six Mantine palette names, so a space's badge was blue or orange by accident of its id. Under your rule that makes it a name, and it is now neutral. The settings drawer's code that read Mantine's variables back to paint it is gone. Only the company badges carry a real user colour; they keep `brandColor`, with the white ink Mantine's filled badge gave them. On a light brand colour that ink can be weak; it is the user's data, but say if you want the ink picked against the brand colour instead.

**The private-campaign notice was a contrast defect.** The campaign viewer told a visitor "This campaign is private" in the theme's text on a `Paper` with Mantine's fixed `red.9`, so on light themes it was dark text on dark red. You had named `bg="red.9"` as a danger fill. It is an assertive status message, so it is now a filled danger `Alert`, with the danger fill's audited ink and its glyph.

## 3. Surfaces: the neutral flip first, then the ladder

`Paper` and `Card` are on the framework, painted exactly as before: `surface`, the theme's border on `withBorder`, Mantine's 16px card padding. Getting there found the surfaces had the same inheritance leak as every other family (a `Paper` inside a padded card took the card's padding), and that a card section conflated two values: it bled by its own padding instead of the card's. Both are fixed and tested.

One thing does change on its own: a bordered `Paper` used Mantine's fixed `gray-3` (light) or `dark-4` (dark) border, not the theme's, because the adapter only set the card's. It now draws the theme's `border`, like the card.

**The question for rule 13.** Today every `Paper` and `Card` paints `surface`, and 31 of them carry a border. Rule 13 says a raised element reads by lightness on a dark theme and by a hairline and its shadow on a light one, and that a border standing in for a missing rung should go. That needs a line between a panel and a raised panel, and I would rather you draw it than infer it. My proposal:

- **A panel on the page** (a settings section, the admin panel's own card, the gallery's campaign cards) stays on `surface`. It is already one rung above `background`.
- **A panel over a panel** (a card inside a modal, a drawer or another card; a dropdown-like popover card) takes `surfaceRaised`, with `raised-bd` (the light-theme hairline, transparent on dark) in place of its border.
- **A `withBorder` that only separates two things on the same ground** (a stat tile in a row of four) keeps the theme's `border`; it is a divider, not elevation.

If that split is right, I will classify the 31 the way I did the badges and send you the list before anything moves.
