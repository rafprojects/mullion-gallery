# Mullion — colour spec (Rig Cyan), v2

**v2, 2026-08-31.** Supersedes the v1 spec and its five rounds of addenda. v1 was a
negotiation document — proposals, corrections, and engineering follow-ups accumulated over a
six-round collaboration with the designer. Everything it proposed has since shipped, so v2 is
a description of the **built system**, re-measured against the code on the date above. The
round-by-round history lives in git and in
[`correspondences/`](correspondences/); nothing in it is still pending.

**Every number in this file is measured, not modelled.** Contrast ratios and hue angles were
computed with chroma-js from the shipped hex values; ramp rungs, shade indices, and resolved
fill/stroke colours were produced by running the shipped `resolveColors()` /
`generateColorScale()` from `@mullion/theme-engine` on the shipped theme JSON. The v1 rule
still stands and is worth keeping: *pure colour math on fixed hexes can be trusted directly;
any number that models the generator must be re-measured against the code before it becomes a
value.* Three v1 numbers died by that rule; none of them survive here.

**2026-10-02: §8 added.** The designer's standing rules, collected from the week of
correspondence that ended 2026-09-14, plus the elevation rule from their 2026-10-02 answers.
The copy before this change is archived in
[`archive/2026-10-02-pre-standing-rules/`](archive/2026-10-02-pre-standing-rules/).

**2026-10-07: rule 13 revised, rule 14 added.** Rule 13's second sentence is replaced with the
designer's corrected text, and rule 14, the `border` floor, is the designer's decision of
2026-10-06. The engineering note under rule 13 now records how the engine meets both. The copy
before this change is archived in
[`archive/2026-10-07-pre-rule-13-revision/`](archive/2026-10-07-pre-rule-13-revision/).

**2026-10-07, later: the engineering note under rule 13 rewritten.** The designer reversed the dark
half of P80-G's elevation resolution the same day, and the note now describes the reversed one. No
rule's text changed. The copy before this change is archived in
[`archive/2026-10-07-pre-elevation-reversal/`](archive/2026-10-07-pre-elevation-reversal/).

## 1. Theme tokens — what the plugin consumes

Shipped as theme **`default-dark`** ("Mullion") in
[`packages/theme-engine/src/definitions/default-dark.json`](../../packages/theme-engine/src/definitions/default-dark.json).
Authored roles:

| Role          | Hex       | Use                    |
|---------------|-----------|------------------------|
| background    | `#08141b` | page ground            |
| surface       | `#102530` | cards, panels          |
| surfaceRaised | `#1a3542` | menus, popovers        |
| border        | `#22414f` | decorative dividers    |
| borderStrong  | `#648284` | input outlines, focusable edges |
| text          | `#eef8fb` | body copy              |
| textMuted     | `#9db4bf` | secondary copy         |
| primary       | `#1ad1c4` | accent seed — expands to the 10-rung ramp (§3) |
| success       | `#56b93e` | confirmations          |
| warning       | `#f5b12b` | cautions               |
| error         | `#ff6b5e` | failures               |
| info          | `#1ad1c4` | informational status (same as accent, deliberately) |
| accent / accentGreen / accentPurple | `#1ad1c4` / `#56b93e` / `#a855f7` | optional accent variants |

The schema also carries three roles the theme does **not** author — the engine derives them
at resolve time, and for Mullion they resolve to:

| Derived role | Resolves to | Derivation |
|---|---|---|
| surface2   | `#132a36` | LAB interpolation surface → surfaceRaised (input fills) |
| surface3   | `#17303c` | same interpolation, one stop further (builder panels) |
| textMuted2 | `#b9cbd4` | LAB mix of text and textMuted (placeholders) |

**Two border tokens on purpose.** `border` is 1.46:1 on `surface` and that is correct — WCAG
1.4.11 exempts decorative dividers. `borderStrong` is for borders that *are* the affordance
and clears 3:1 on all three grounds it is painted on: 3.81 on `surface`, 3.59 on `surface2`,
3.11 on `surfaceRaised` (and 4.50 on `background`). It stays distinct from `border` at 2.62:1
between them. A gate testing all borders at one threshold will be wrong in one direction or
the other.

**`borderStrong` must never alias to `border`.** For themes that omit it, the engine
*derives* it (`deriveBorderStrong()` in `colorGen.ts`): step the surface's own lightness
toward mid-grey, holding hue and easing chroma, until 3:1 clears against `surface`,
`surface2`, **and** `surfaceRaised`. Themes that author the field override the derivation;
themes that don't get something that passes rather than something that doesn't. (v1's
proposed derivation shipped verbatim; its four worked examples landed exactly.)

> **History:** v1 specified `borderStrong: #577577`, which measured 2.58:1 on
> `surfaceRaised` — verified against `surface` only, never the raised ground. Corrected to
> `#648284` (same hue, 3.11:1 on `surfaceRaised`) during the light-theme review, shipped in
> P75-G. The derivation and the CI audit now both sample the raised ground, so the class of
> omission can't recur silently.

## 2. `primaryShade` — shipped values and the criterion behind them

`default-dark.json` authors:

```json
"primaryShade": { "light": 6, "dark": 5 }
```

These are **array indices** into the generated 10-rung ramp (never Tailwind-style rung
names — name `50` is index 0, name `950` is index 10, and the code indexes an array). The
values are a data snapshot of a criterion, not hand-picked numbers:

> the first rung from the light end that clears 4.5:1 against the theme's ink ground AND
> 4.5:1 under white text

> **Correction to the v1 wording, for anyone reading an archived copy.** v1 stated the
> criterion as *"the first rung from the **dark** end"*. That is backwards against this ramp's
> ordering and would select index 9, `#002825` — near-black. The passing band here is indices
> 5–9; walking from the light end gives index 5, which is the shipped and correct value. The
> implementation is right and the v1 phrasing was wrong; it is a fourth v1 error to add to the
> three this document already records.

That criterion is *live code*: when a theme omits `primaryShade`, `derivePrimaryShade()`
derives both indices from it, and `selectPrimaryShadeIndex()` is the single implementation.
For a dark theme with no light surface, the ink ground falls back to a near-neutral light
ink — for Mullion, `text` `#eef8fb`. Authored values in shipped JSON were all re-derived by
this criterion against the OKLCH ramp when the generator migrated (P75-F); re-derive again if
the generator ever changes, because **an index names a position in a ramp, not a colour**.

For Rig Cyan the dark index 5 resolves to **`#007870`** — 5.36:1 under white. This is the
filled-button colour, and it is hue-identical (OKLCH 186.7° vs the 186.8° seed) to the brand
"accent on light" in §5 — in fact it *is* that value.

## 3. The ramp, and the fill/stroke split

`generateColorScale()` steps **OKLCH lightness** linearly between scheme endpoints (light
scheme 0.95 → 0.25, dark scheme 0.85 → 0.25), holding the seed's chroma and hue, then
gamut-maps each rung into sRGB by **binary-searching chroma downward** with L and H held —
never by channel clipping, which shifts hue. (v1's Cyberpunk example is now measurable: the
shipped light-scheme rung 0 for `#ff2d95` is `#ffe7ee`, the gamut-mapped value v1 predicted,
not the 24.8°-drifted naive clip.)

The shipped Rig Cyan dark ramp:

```
index:  0        1        2        3        4        5        6        7        8        9
hex:    #47e9dc  #20d3c6  #00bcb0  #00a59a  #008e85  #007870  #00635c  #004f49  #003b37  #002825
                                            stroke   fill
```

One accent seed produces **three resolved roles** (P75-E — this replaced a hardcoded
`primary[5]` that ignored every theme's authored shade):

| Role | Rig Cyan dark | What it is |
|---|---|---|
| `primaryFill`   | `#007870` (index 5) | the authored `primaryShade` rung — filled buttons, selected backgrounds |
| `primaryStroke` | `#008e85` (index 4) | nearest rung clearing 3:1 against `surface` / `surface2` / `surfaceRaised` — focus rings, active-tab and builder outlines, input focus borders. Equals `primaryFill` when the fill already passes (10 of 23 themes) |
| `primaryOnFill` | `#ffffff` | white or black, whichever contrasts better on `primaryFill` |
| `focusHalo` | `#edf5fb` | P77-F: a neutral from the background's hue, stepped toward whichever pole clears 3:1 against `primaryStroke`. The scheme picks which pole is tried first, not the answer: five bundled dark themes have accents light enough that the halo correctly resolves dark. The focus ring's second tone; never a second accent. The 3:1 target is at the system ceiling and must not be raised (designer sign-off, 2026-09-11) |

The split exists because the two jobs pull the criterion in opposite directions: the fill
answers 4.5:1 *under white text*, and that same rung often fails 3:1 *as a thin line on a
dark panel* (Rig Cyan fill on surface: 2.95:1). 13 of 23 bundled themes need the split.

The focus ring is genuinely painted from `primaryStroke` product-wide (P76-I-2 re-pointed
Mantine's global `:focus-visible` ring at it, replacing `primaryFill`, which failed 3:1 on
13 of 23 themes as painted), and inputs signal focus through `--input-bd-focus` set to the
same token. Since P77-F the ring is two-tone: the 2px `primaryStroke` core sits inside a
6px `focusHalo` box-shadow, so 2px of halo shows on either side of the core. The geometry is
the same on every theme; only the two colours resolve per theme. The point is structural:
a single-colour ring is only as visible as its contrast with whatever is behind it, and a
user-authored theme can put it under 3:1 where no build-time audit can see. With a light
neutral halo on dark themes and a dark one on light, one of the two tones contrasts with
any ground.

## 4. The CI gates — what is enforced, with measured values

Two blocking audits in `@mullion/theme-engine`, both run per-theme over all 23 bundled themes
in the Vitest gate. They model the pairings the adapter actually paints — a token change that
drops below the bar fails CI rather than shipping.

**`auditThemeContrast` — WCAG 2.1 AA text, 4.5:1.** Measured on `default-dark`:

| Pairing | Ratio |
|---|---|
| text on background / surface / surface2 / surface3 | 17.28 / 14.64 / 13.78 / 12.76 |
| textMuted on surface / surface3 | 7.31 / 6.37 |
| textMuted2 on surface / surface2 | 9.45 / 8.89 |
| white button label on primaryFill `#007870` | 5.36 |
| text on a caption scrim (background at 0.85 over a white photo, the worst case here) | 11.28 |

**`auditUiContrast` — WCAG 1.4.11 non-text, 3:1.** Measured on `default-dark`:

| Pairing | Ratio |
|---|---|
| primaryStroke on surface / surface2 / surfaceRaised | 3.92 / 3.69 / 3.19 |
| borderStrong on surface / surface2 / surfaceRaised | 3.81 / 3.59 / 3.11 |
| focus halo against ring core (the pair contrasts with itself) | 3.66 |
| focus ring pair on surface / surfaceRaised (halo carries it) | 14.33 / 12.50 |

Scope caveat (recorded in the audit's own header): these gates cover **theme-derived
chrome**. Gallery content borders (`card_border_color`, `tile_border_color`, …) are arbitrary
user-set hexes by design, and no theme-level audit can see them.

## 5. Brand colours — surfaces the theme system never sees

WordPress.org listing, Freemius opt-in, banners, marketing, docs.

| Role            | Hex       | Note                                    |
|-----------------|-----------|-----------------------------------------|
| brand ground    | `#08141b` | banner and icon tile                    |
| brand accent    | `#1ad1c4` | on dark grounds only                    |
| accent on light | `#007870` | OKLCH hue 186.7° vs brand seed 186.8°; identical to the dark theme's resolved fill and to the light theme's authored `accent`/`primary` |
| wordmark ink    | `#0d1b23` | wordmark on light grounds               |

The bright accent fails on white (1.92:1) and on the light theme's grounds (1.64:1). Any
accent-coloured text or icon on a light ground uses `#007870`. This is a brand rule, not a
theme token — but brand and product deliberately share the one teal. (One nuance: the *light
theme's* filled buttons resolve one rung darker, to `#006e66` — see `LIGHT-THEME-SPEC.md`
and the open note to the designer.)

## 6. Status rule

Status must never be carried by colour alone — icon plus text, always (WCAG 1.4.1). This
holds regardless of hue separation and is the reason the success/accent adjacency is not
worth over-engineering.

## 7. v1's open questions — all three answered by shipped code

1. **Is the ramp OKLCH or HSL?** OKLCH, since P75-F, with chroma-reduction gamut mapping.
   Shade indices therefore transfer between spec and code; every shipped `primaryShade` was
   re-derived by criterion in the same change that swapped the generator.
2. **Does admin chrome re-theme with the gallery?** No, by default. The Settings Panel and
   Layout Builder chrome lock to the Mullion brand palette; a single setting,
   `applyThemeEverywhere` (default **false**), lets a user opt the editor chrome into the
   selected gallery theme. The public gallery always follows the selected theme.
3. **Is Layout Builder selection drawn in the theme accent?** It is drawn in
   `primaryStroke` — the contrast-selected rung, not the raw accent — and the builder
   outline/drop-target sites are in the 1.4.11 audit.

## 8. Standing rules

Added 2026-10-02. Rules 1 to 12 are the designer's own text, verbatim from
[`designer-standing-rules-2026-09-14.md`](correspondences/designer-standing-rules-2026-09-14.md),
which wrote them as an addendum for this file. They are what survived a week in which nine
documents were exchanged and five of them reversed something. Rule 13 is from
[`designer-answers-catching-up-2026-10-02.md`](correspondences/designer-answers-catching-up-2026-10-02.md),
and rule 14 from
[`designer-answers-text-title-2026-10-26.md`](correspondences/designer-answers-text-title-2026-10-26.md).

### Grounds and inks

**1. Every ground a value is painted on belongs in that value's audit set, at the floor appropriate
to what the value is.** Not every ground needs its own ink — there is often a cheaper answer — but
no ground should be unmeasured. *(Origin: 99 failures across three derived grounds nobody had
audited, 2026-09-13.)*

**2. Tint the ground or colour the ink, never both.** A ground tinted toward its own ink loses
contrast monotonically; there is no ink that escapes it. *(P79-C, June. Independently re-derived and
then found already shipped, 2026-09-13.)*

**3. Selection at the nearest passing rung has no margin by construction.** The semantic colours
stop at the first rung clearing 4.5:1, which is why the tightest theme sits 0.03 above the floor and
why any new derived ground breaks immediately. This is a property to remember, not a defect to fix —
raising the target globally was priced and rejected.

**14. A caption over an image sits on a scrim that reaches the audited opacity at the caption
line, with the fade complete before the first glyph.** The scrim is black with white text where the
surface is not themed (the media picker: 0.60, 5.74:1 over a white image), and the theme's
`background` with the theme's `text` where it is (the lightbox). *(Designer, 2026-10-26, who
proposed 0.60 for both. Measured over the worst photo, theme text needs up to 0.81 on the bundled
themes, Catppuccin Latte the tightest, and 13 of 23 fail at 0.60; the themed scrim therefore
reaches `CAPTION_SCRIM_OPACITY`, 0.85, which the text audit reads. Muted ink needs up to 0.99 and is
never used on a scrim.)*

### Signals

**4. The focus ring marks keyboard focus. It is not a selection mark, an active mark, or an emphasis
mark.** Anything that needs to look chosen gets its own treatment. *(Reached for twice in one week,
clipped both times it landed.)*

**5. A non-colour signal must differ by shape or by words.** A role-coloured rail, border or dot is
still colour and fails the same test: at full chroma, success and warning are ΔE00 2.7 apart under
protanopia, and on a 14% wash they are 0.00. *(2026-09-14.)*

**6. A pair contrast is a floor for function, not a target for appearance.** Raising `halo:core`
past the pole ceiling can only come out of `halo:surface`, and the second is what makes an indicator
findable. *(2026-09-11.)*

### Geometry

**7. The focus ring's reach is 6px.** The outline sits inside the halo's spread; they do not stack.
A ring specified as three 2px bands cannot reach further than three 2px bands.

**8. Filled controls take the outset ring and must be given ≥6px of clearance. Flush controls on
neutral or washed grounds take the inset ring. Filled *and* flush is a layout defect, not a ring
variant.**

**9. Ring weight cannot be judged magnified.** 1/2/1 looks fine at 4× and loses its two-tone
character at true size. Judge indicators at the size they ship. *(Same failure mode as the 16px
aperture icon.)*

### Measurement

**10. ΔE is CIEDE2000 unless labelled otherwise.** ΔE\*ab inflates 1.1–2.6× at high chroma and
1.06× on neutrals — which is an artefact, not a perceptual gap, and semantic colours are nothing but
high-chroma colours.

**11. A number is measured only if it came from the rendered result.** *(Yours, 2026-09-14.)*

**12. Pure colour maths on fixed hex values reproduces exactly and can be used directly. Anything
that models the plugin's own code must be measured before it is used.** *(2026-08-25, and it has
held every time either of us ignored it since.)*

### Elevation

**13.** **Elevation is carried by ground lightness on dark themes and by border and shadow on light
themes.** Dark themes have three rungs — `background`, `surface`, `surfaceRaised` — and a raised
element needs no border to be read as raised. Light themes have two, and a raised element carries
a 1px `borderStrong` hairline and its shadow. `surfaceRaised` must be strictly above `surface2` on
every theme. **On dark themes** `surface2` and `surface3` sit between `surface` and
`surfaceRaised`. **On light themes** they may instead recess below `surface`, as input fills;
`surfaceRaised` must never be darker than `surface`. Neither is one side of an elevation pair on
its own. *(2026-10-02; second sentence revised 2026-10-06.)*

> **Engineering note, 2026-10-07: the bundled themes satisfy rules 13 and 14 (P80-G).** On the
> bundled dark homages the step from `surface` to `surfaceRaised` is already ≥ ΔE00 2.0 on all thirteen; the
> collision was `surface2`, not the ladder. The ports authored `surface2` as the rung itself, so when
> a dark theme does not author `surfaceRaised`, the engine keeps that value as the raised ground and
> re-derives `surface2` and `surface3` as the intermediates between it and `surface`. Only neutral
> fills move; no accent, role text or ring colour does. A dark theme with no rung that far above
> `surface` is lifted instead, toward `surface3`, stopping where role text would fall under 4.5:1;
> no bundled theme needs that. A light theme that does not author `surfaceRaised` takes `surface`.
> Every bundled theme is tested against both rules by name.

**14.** **`border` must sit at least ΔE00 3.5 from every ground it can be drawn on, and the engine
steps it when an authored value does not.** The floor is just under the tightest pair the default
themes ship (default-dark, 3.84 on `surfaceRaised`). The step moves `border`'s lightness away from
the grounds, lighter on dark themes and darker on light, holding hue, and stops before it reaches
`borderStrong`. If there is no room, CI fails and names the theme. Move `border`, never the
ladder. *(2026-10-06.)*

---

# Rig Cyan Light — summary

Full spec, verification and rationale in [`LIGHT-THEME-SPEC.md`](LIGHT-THEME-SPEC.md).
Shipped as theme `default-light` ("Mullion Light").

| Role | Dark | Light |
|---|---|---|
| `background` | `#08141b` | `#e9eef1` |
| `surface` | `#102530` | `#f7fafb` |
| `surfaceRaised` | `#1a3542` | `#ffffff` |
| `border` | `#22414f` | `#cddadb` |
| `borderStrong` | `#648284` | `#78898b` |
| `text` | `#eef8fb` | `#132025` |
| `textMuted` | `#9db4bf` | `#5f6c71` |
| `primary` / `accent` | `#1ad1c4` | `#007870` |
| `success` | `#56b93e` | `#227b00` |
| `warning` | `#f5b12b` | `#8e6200` |
| `error` | `#ff6b5e` | `#c5342d` |

- Elevation reads lighter in **both** themes: `background` is the darkest of the three
  grounds in each. Do not invert the dark stack.
- Labels on accent fills are **white in both themes** (dark fill `#007870` → 5.36:1; light
  fill `#006e66` → 6.14:1). Never the `text` token (2.71:1 on the light fill).
- Status colours are hue-locked to their dark siblings (≤ 0.6° OKLCH delta), gamut-mapped.
