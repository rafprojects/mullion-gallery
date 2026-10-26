# Badges need a rule before they move, and the scrim needed a different number

**2026-10-26.** Follows `designer-answers-text-title-2026-10-26.md`.

Headings are 600, and the three-weight rule is in `DESIGN_BRIEF.md` with 700 kept for the wordmark. Applying it found fifteen other places using 700: the campaign viewer's four stat figures, the small uppercase section labels in four builder panels, the Media tab's heading, campaign and media titles in three admin views, the emphasised campaign name in the request-access form, the builder's template-name field and its slot-number badges. All are 600 now. The slot-number badge is also 10px white text on a fixed blue, another size below the scale that the `Text` pass could not see because it is not a `Text`; it is on my list for its surface's batch.

Two things below need you: the scrim's number, which the CI row you asked for disproved, and a rule for badges, which I cannot write from the colour table.

---

## 1. The caption scrim: 0.60 fails 13 of 23 themes; 0.85 clears them all

The CI row went in as you described: theme `text` on the theme `background` at the scrim's opacity over the worst photo (white under light text, black under dark), at 4.5:1. My arithmetic reproduces your two figures exactly, 4.53 on default-dark and 5.12 on default-light. The other 21 themes are less extreme than the defaults, though, and 40% of a white or black photo pulls their ground much closer to their text:

| Theme | Text on its scrim at 0.60 | Opacity it needs |
|---|---|---|
| Darcula | 2.40 | 0.80 |
| Halloween | 2.47 | 0.77 |
| Catppuccin Latte | 2.52 | **0.81** |
| Gruvbox Dark | 2.96 | 0.74 |
| Catppuccin Mocha | 3.02 | 0.73 |
| Forest Whisper | 3.09 | 0.73 |
| Ocean Breeze | 3.13 | 0.73 |
| Nord | 3.21 | 0.72 |
| Tokyo Night | 3.28 | 0.70 |
| Material Dark | 3.70 | 0.66 |
| Synthwave | 3.74 | 0.66 |
| Solarized Dark | 3.90 | 0.65 |
| Cyberpunk | 4.29 | 0.62 |
| the other ten | 4.53 to 7.37 | 0.46 to 0.60 |

So I shipped **0.85**: one engine constant, `CAPTION_SCRIM_OPACITY`, which the lightbox paints through a token and the audit reads, so the gate checks what is drawn. Every bundled theme clears; the tightest is Catppuccin Latte at 5.01. At 0.60 the gate fails exactly those thirteen, which I checked before restoring it.

**The question: one number, or one rule?** 0.85 is heavier than ten themes need. The alternative is to derive the opacity per theme, the smallest value at which that theme's text clears 4.5:1, the way the tone ladder picks its rungs. That gives the lightest scrim each theme can carry, at the cost of the scrim's weight varying between themes. I lean to the single number, because a caption band that looks different on every theme is a strange thing to explain, but it is your call.

**Muted ink cannot sit on a scrim at all.** It needs up to 0.99. The lightbox's "3 / 8" counter was muted; it now takes the theme's text, at its smaller size, which is the only option that clears.

**A correction about which lightbox this is.** The caption I fixed is in the admin's media preview (`MediaLightboxModal`), not the visitor-facing lightbox. The visitor's lightbox puts its caption below the image on a 93% black backdrop, so it never had this problem. Your "after `Select` and the dialogs" pass on the visitor lightbox still stands, on the list.

The black thumbnail scrim is unaffected: white on black at 0.60 over a white image is 5.74:1 on every theme, because neither colour comes from a theme. Both are now rule 14 in `COLOR-SPEC.md`, in your words, with the number change noted.

## 2. Badges: most of them are not statuses

Since P80-A a toned `Badge` carries its role glyph, and your table maps `blue` on a status component to `info`. Applied to the product's 76 badges, that would put an info glyph on a badge reading "Image" and a success glyph on one reading "Company". Most of them are not reporting a state:

| What the badge is | Sites | Examples | Colours used today |
|---|---|---|---|
| **A state** | 15 | Offline; campaign active / draft / archived; request approved / rejected; 3 pending; severity; scheduled / expiring / expired; cache active / not detected; identical content; font failed to load | red, green, orange, yellow, teal, gray, blue |
| **A category** | 19 | media type (image / video), media source (upload / external), file type, font format, template origin (built-in / custom), aspect ratio, overrides (custom / default) | blue, violet, grape, teal, gray, dark |
| **A role or level** | 5 | viewer / editor, admin, space isolation (open / delegated), grant source (company / direct) | gray, yellow, blue, green, orange |
| **A count** | 18 | 4 grants, 2 users, 12 views, slot count, filter count, tag counts | blue, teal, orange, none |
| **A tag or a name** | 19 | campaign tags, a space's name, a company's name, event names, slot numbers | none, blue, gray |

The full list, file by file, is in the appendix below.

**My proposal, for you to correct:**

- **A state** takes its role tone and its glyph. That is the case the glyph was built for.
- **A category, a role or a count** takes **no role tone**: `tone="default"`, no glyph. Rule 5 says a signal must differ by shape or words, and every one of these already carries its word ("Video", "External", "Editor"), so the colour difference between categories is decoration that only some readers get. Today "Video" is violet and "Image" is blue; under this proposal both are the neutral badge, told apart by their words.
- **A tag or a name** stays neutral as well. The two that carry a user-chosen colour (a space's colour, a company's brand colour) keep it, since that colour is the user's data, not a role, the same exception `ColorSwatch` has.
- **The `dot` variant** goes to `outline` with the tone, as you decided; two of the four dot badges are a count and a name, which become neutral outlines under this proposal; the other two mark a customised shortcut, a state.

What I need from you is whether that split is right, and whether **counts** should be neutral or `primary` (a count is often the one thing a row wants you to notice, like "3 pending"). Until you answer, badges stay on Mantine; nothing else depends on them.

## 3. What moves next

The rest of the layout family (`Box`, `Center`, `Container`, `Grid`, `SimpleGrid`), the surfaces (`Paper`, `Card`) and `Alert`. Alerts are all states, so your colour table applies to them as written. One thing found while reading `Alert`: the framework's version always set `role="alert"`, overriding the two alerts that ask for `role="status"`, which would have made two polite announcements assertive. That is fixed in the framework before anything moves.

---

## Appendix: every badge

| Site | Today | Content | Class |
|---|---|---|---|
| `AccessTab.tsx:174` | light | company id | name |
| `AccessTab.tsx:183`, `:208` | blue light | Access {{count}} | count |
| `AccessTab.tsx:191` | green light | {{count}} active | count |
| `AccessTab.tsx:192` | gray light | {{count}} archived | count |
| `AccessTab.tsx:245` | light | {{count}} users | count |
| `AccessTab.tsx:372` | blue filled | Admin | role |
| `AdminPanel.tsx:251` | space colour, light | the space's name | name (user colour) |
| `AdminPanel.tsx:363` | blue filled | active filter count | count |
| `AnalyticsDashboard.tsx:228` | red filled | Offline | state |
| `AnalyticsDashboard.tsx:398`, `:434` | blue light | views | count |
| `AnalyticsDashboard.tsx:401` | teal light | lightbox opens | count |
| `AuditEventRow.tsx:31` | by severity | info / warning / error | state |
| `CampaignsMobileList.tsx:122` | teal / gray / yellow | active / archived / draft | state |
| `CampaignsMobileList.tsx:125` | light | public / private | category |
| `CampaignsMobileList.tsx:126`, `useCampaignsRows.tsx:129` | blue / orange / red | scheduled / expiring / expired | state |
| `CampaignsMobileList.tsx:127` | gray dot | company id | name |
| `CampaignsMobileList.tsx:130`, `useCampaignsRows.tsx:173` | blue light | grants | count |
| `FontLibraryManager.tsx:112` | gray light | font format | category |
| `FontLibraryManager.tsx:114` | blue light | All spaces | category |
| `KeyboardShortcutsModal.tsx:154`, `:261` | blue dot | custom / customized | state |
| `KeyboardShortcutsModal.tsx:236`, `:259` | light | Navigation / Campaigns | category |
| `DesignAssetsGrid.tsx:100`, `SpaceAssetLibrary.tsx:174` | dark filled | file type | category |
| `MediaPickerSidebar.tsx:279` | light | Slot n | name |
| `MediaPickerSidebar.tsx:348`, `:417` | blue filled | assigned slot numbers | name |
| `PresetGalleryModal.tsx:119`, `LayoutTemplateList.tsx:496` | light | n slots | count |
| `PresetGalleryModal.tsx:123`, `LayoutTemplateList.tsx:507`, `useCampaignsRows.tsx:189`, `:200`, `CampaignCard.tsx:207` | outline or light | tags and categories | tag |
| `LayoutTemplateList.tsx:653` | dark filled | aspect ratio | category |
| `MediaCard.tsx:100`, `MediaTabSortableItems.tsx:89` | violet / blue filled | video / image | category |
| `MediaCard.tsx:101`, `MediaTabSortableItems.tsx:90` | grape / teal light | external / upload | category |
| `MediaUsageBadge.tsx:124` | passed in | usage count | count |
| `PendingRequestsPanel.tsx:86` | orange filled | {{count}} pending | state |
| `PendingRequestsPanel.tsx:189` | green / red light | approved / rejected | state |
| `SettingsPanel.tsx:616` | space colour, light | the space's name | name (user colour) |
| `SpaceManagementView.tsx:338` | light | default | category |
| `SpaceManagementView.tsx:343` | orange / gray outline | delegated / open | role |
| `SpaceManagementView.tsx:475`, `useAccessRows.tsx:131` | gray / yellow light | viewer / editor | role |
| `TaxonomyManagerModal.tsx:105` | gray light | parent name | name |
| `TaxonomyManagerModal.tsx:106`, `:134` | light | counts | count |
| `TemplatePickerModal.tsx:93`, `TemplatesTab.tsx:192` | blue / gray light | built-in / custom | category |
| `MediaLibraryPicker.tsx:99`, `UnifiedCampaignModal.tsx:848` | light | media type | category |
| `UnifiedCampaignModal.tsx:160` | filled | media count | count |
| `UnifiedCampaignModal.tsx:476` | grape light / gray outline | custom / default overrides | category |
| `UnifiedCampaignModal.tsx:480` | violet light | override summary | category |
| `CampaignCard.tsx:166` | green filled | Access | state |
| `CampaignCard.tsx:177`, `CampaignViewer.tsx:112` | brand colour | company logo and name | name (user colour) |
| `NearDuplicateWarning.tsx:94` | orange light | identical / similar | state |
| `TypographyEditor.tsx:279` | orange light | font failed to load | state |
| `AdvancedSettingsSection.tsx:407`, `:409` | green / gray filled | cache active / not detected | state |
| `AdvancedSettingsSection.tsx:412` | blue outline | cache backend name | name |
| `WebhookSettingsSection.tsx:168`, `:173` | outline / light | All events / event names | tag |
| `useAccessRows.tsx:111` | blue / green light | company / direct | role |
| `useAccessRows.tsx:116` | gray light | Expired | state |
| `useCampaignsRows.tsx:177` | orange dot | pending request count | count |
| `shared-ui/SpaceSwitcher.tsx:33` | space colour, light | the space's name | name (user colour) |
