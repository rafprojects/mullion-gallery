# The 31 surfaces, classified, and one premise to check first

**2026-10-26.** Follows `designer-answers-surfaces-2026-10-26.md`.

"Unused" is `warning`. The company badge's ink is now black or white against the brand colour, through one engine function (`inkOn`) whose comment says it is the better of two, not a guarantee. On the dev site the test company's yellow badge carried white text at 2.20:1; it will carry black, at 9.53:1.

The campaign card is also checked on the dev site after the surface flip. Its padding, thumbnail band and badge positions are what its settings ask for. One thing to know: the Access badge shows its own eye icon rather than the success glyph, because the site passes an icon explicitly. The eye and the word already give a signal that is not colour, so I left it.

---

## 1. Dialogs and drawers are not raised today

Your ceiling clause rests on modals and drawers already being on the top rung. They are not. The framework's `Modal` and `Drawer` paint `surface`, and so did the Mantine adapter they replace. A dialog is one rung above the dimmed page, the same rung as a panel.

That changes where the ceiling bites. As things stand, a card inside a dialog sits on `surface`, so it goes up to `surfaceRaised` with the hairline; only a card inside that card reaches the ceiling. If dialogs should be raised themselves (they float over everything, which is a reasonable reading of rule 13), every card inside one takes the ceiling clause instead: it stays on the dialog's ground and takes `border`.

**Which should it be?** Dialogs on `surface` keeps the nesting room. Dialogs on `surfaceRaised` makes a floating thing read as floating on dark themes, at the cost of every card inside one being a bordered tile. The table below assumes dialogs stay on `surface`, and it marks the rows that would move if you choose otherwise.

## 2. The 31

"Sits on" is the ground under the surface where it is actually rendered, which for most of them is in another file. The admin panel is a card on the page, so everything inside its tabs sits on `surface`; so does everything in the settings drawer and in a dialog.

| Surface | Sits on | Today | By the rule | If dialogs are raised |
|---|---|---|---|---|
| `AdminPanel.tsx:240`, the admin panel itself | `background` | `surface`, border, shadow | `surface`; border only if it separates from a sibling, and it has none, so **no border** | same |
| `CampaignCard.tsx:90`, the gallery's campaign card | `background` | `surface`, a border and accent from the site's card settings | unchanged: the border is the site owner's setting, not elevation | same |
| `AccessTab.tsx:123`, `:228`, `:308`, `:317`, sections of the Access tab | `surface` (admin panel) | `surface`, border, shadow | `surfaceRaised`, `raised-bd` | same |
| `AnalyticsDashboard.tsx:299`, `:315`, `:364`, `:413`, the chart and table sections | `surface` (admin panel) | `surface`, border | `surfaceRaised`, `raised-bd` | same |
| `AnalyticsDashboard.tsx:94`, a stat tile in a row of them | `surface`, beside siblings | `surface`, border | unchanged, `border` as a divider | same |
| `BulkActionsBar.tsx:39`, the bar that appears over the campaign list when rows are selected | `surface` (admin panel) | `surface`, shadow, no border | `surfaceRaised`, `raised-bd` | same |
| `CampaignsMobileList.tsx:82`, one card per campaign on narrow screens | `surface` (admin panel) | `surface`, border | `surfaceRaised`, `raised-bd` | same |
| `LayoutTemplateList.tsx:610`, one card per layout template | `surface` (admin panel) | `surface`, border, shadow | `surfaceRaised`, `raised-bd` | same |
| `MediaCard.tsx:51`, one tile per media item | `surface` (admin panel) | `surface`, border, shadow | `surfaceRaised`, `raised-bd` | same |
| `SettingsSystemAdminTab.tsx:37`, the magic-link section | `surface` (settings drawer) | `surface`, border | `surfaceRaised`, `raised-bd` | ceiling (see the note below) |
| `PresetGalleryModal.tsx:91`, a layout preset | `surface` (dialog) | `surface`, border, shadow | `surfaceRaised`, `raised-bd` | ceiling |
| `TemplatePickerModal.tsx:58`, `:82`, "start blank" and each template | `surface` (dialog) | `surface`, border | `surfaceRaised`, `raised-bd` | ceiling |
| `UnifiedCampaignModal.tsx:215`, `:838`, `:868`, `:906`, sections of the campaign editor | `surface` (dialog) | `surface`, border (one with shadow) | `surfaceRaised`, `raised-bd` | ceiling |
| `MediaLibraryPicker.tsx:31`, the picker's frame inside the campaign editor | `surface` (dialog) | `surface`, border | `surfaceRaised`, `raised-bd` | ceiling |
| `MediaLibraryPicker.tsx:65`, one item inside that frame | `surfaceRaised` (the frame) | `surface`, border, shadow | ceiling: `surfaceRaised`, `border` | ceiling |
| `MediaAddModal.tsx:158`, the drop zone | `surface` (dialog) | `surface`, no border | `surfaceRaised`, `raised-bd` | ceiling |
| `MediaAddModal.tsx:341`, the external-link preview | `surface` (dialog) | `surface`, no border | `surfaceRaised`, `raised-bd` | ceiling |
| `CampaignViewer.tsx:259`, `:263`, `:267`, `:271`, the four stat tiles | `surface` (the viewer dialog), beside siblings | `surface`, border | unchanged, `border` as a divider | same |

Note on the settings drawer: under "dialogs are raised", a drawer is raised too, so the magic-link section takes the ceiling like the dialog rows.

**Two rows worth a look.**

- **The admin panel's own card loses its border** under the rule as written, because it has no sibling to separate from. It is the largest surface in wp-admin's front-end view, and on a light theme `surface` against `background` may be a quiet step. If it should keep an edge, say so and it keeps `border`.
- **The bulk-actions bar** has a shadow and no border today, which is already the light-theme half of rule 13. It gains the rung on dark themes and the hairline on light ones.

With your answer to section 1, the "if dialogs are raised" column either applies or does not, and the surfaces move in one batch.
