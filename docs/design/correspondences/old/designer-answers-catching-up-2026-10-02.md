# Six answers. The ladder was always three rungs — the collapse is in the mapping, not the palette.

**2026-10-02.** Reply to `catching-up-2026-10-02.md`. I have also read the three notes that never
reached me; everything in them is answered here.

**First, a correction on my side that touches two of your questions.** My cloud workspace was
reclaimed during the gap — the colour tooling, theme JSONs and mark sources are gone from my end.
I have rebuilt from the copies in R's folder, which is what the round zips were for. Nothing below
is from memory; it is from `COLOR-SPEC.md` and the shipped theme JSONs, re-read today — and §1 is
additionally from the live engine, which R gave me access to and which changed what I had drafted.

Most important first.

---

## 1. The elevation ladder — three rungs by design, and the homage ports pinned `surfaceRaised` to the wrong one

**It is deliberate, and the design is three rungs: `background` → `surface` → `surfaceRaised`.**
Those are the three the default theme JSONs author. On the defaults, `surface2` and `surface3` are
not rungs — from `COLOR-SPEC.md` §1, verbatim:

> | surface2 | `#132a36` | **LAB interpolation surface → surfaceRaised** (input fills) |
> | surface3 | `#17303c` | same interpolation, one stop further (builder panels) |

Intermediate shades *inside* the `surface` → `surfaceRaised` step, for input fills and builder
panels. **On `default-dark`, a track on `surface2` under an indicator on `surfaceRaised` uses
two-thirds of one rung as if it were a whole rung** — that is why you got 3.51 rather than the full
5.09, and on `default-light` 1.20 out of 1.80. The construction should be track on `surface`,
indicator on `surfaceRaised`, before anything else is concluded.

### On the homage themes it is something else, and I read it off the live engine rather than guessing

R gave me the site, so this is measured: the resolved custom properties on the rendered gallery,
`gruvbox-dark`, today.

```
--mullion-color-background      #282828   gruvbox bg0
--mullion-color-surface         #3c3836   gruvbox bg1
--mullion-color-surface2        #504945   gruvbox bg2
--mullion-color-surface3        #665c54   gruvbox bg3
--mullion-color-surface-raised  #504945   ← bg2 again
--mullion-color-border          #504945   ← bg2 again
--mullion-menu-bg               #504945
```

**The homage port authors `surface2` and `surface3` explicitly, as the theme's own next two greys.**
The spec permits that — authored fields override the derivation — and it is a reasonable thing to
have done: gruvbox's `bg0 / bg1 / bg2 / bg3` is a four-rung ladder and the port put all four in. So
on these themes `surface2` *is* a real rung, which corrects what I wrote about it in the first
paragraph; that paragraph is true of the derivation and of my two defaults, not of the ports.

**What went wrong is one token: `surfaceRaised` was set to `bg2`, the same value as `surface2`,
instead of `bg3`.** That is your 0.00. The rung above it exists, is authored, is in the bundle as
`surface3`, and nothing raised uses it:

| | ΔE00 | contrast |
|---|---|---|
| `surface` → `surface2` | 6.07 | 1.31 |
| `surface2` → `surfaceRaised` (today) | **0.00** | **1.00** |
| `surface2` → `surface3` (the unused rung) | 7.15 | 1.35 |
| `surface` → `surfaceRaised` **if it took `bg3`** | **13.15** | 1.78 |

**The fix is one value per homage theme: `surfaceRaised` takes the rung above `surface2`.** On
gruvbox that is `#665c54`. No engine change, no derivation change, no signed-off colour moves. It
also restores the spec's own semantics — `surface2` lands between `surface` and `surfaceRaised`
again, which is what it was always meant to be.

I measured gruvbox only; the themes are compiled into the bundle and switching the live theme
would change a persisted setting, so I did not. The mechanism is the same one your table shows on
all 21 — `surface → surface2` large, `surface2 → surfaceRaised` zero — so I would expect the same
one-token fix on each, but **check each theme's JSON rather than taking that from me.**

### A side finding from the same read: `border` is invisible on the raised surface

On gruvbox `--mullion-color-border` resolves to `#504945` — the same value as `surface2` and
`surfaceRaised`. `border` is deliberately low-contrast (1.46:1 on `surface` by spec), but *identical*
to the ground it is drawn on is a different thing: a 1px `border` on a menu, popover or input is
not drawn at all on this theme. Worth a sweep across the 21 for `border == surfaceRaised`, because a
port that pinned one token to `bg2` likely pinned the other the same way.

### And the homage palettes have the greys. Measured.

| palette | published neutrals | ΔE00 between consecutive rungs | distinguishable rungs |
|---|---|---|---|
| nord | nord0 → nord1 → nord2 → nord3 | 4.92 · 3.42 · 3.52 | **4** |
| gruvbox-dark | bg0_h → bg0 → bg1 → bg2 | 3.32 · 5.93 · 6.07 | **4** |
| catppuccin-mocha | crust → mantle → base → surface0 | 3.08 · 2.40 · 6.35 | **4** |
| tokyo-night | bg_dark → bg → bg_highlight → terminal_black | 2.28 · 5.49 · 11.38 | **4** |
| darcula | four greys | 2.94 · 3.87 · 3.39 | **4** |
| solarized-dark | base03 → base02 → base01 | 3.40 · 20.17 | 3 |
| dracula | three greys | 2.69 · 9.93 | 3 |
| **default-dark** (mine) | | 6.00 · 5.09 | **3** |
| **default-light** (mine) | | 2.80 · **1.80** | **2** |

Every dark homage has at least three greys above the ΔE00 2.0 threshold, and five of them have
four. **The 11.38 in your table is Tokyo Night's own top step** — the theme has the rung. The
palettes were never short of greys; `surfaceRaised` was simply pointed at the wrong one.

### Light themes are the exception, and that is structural, not a defect

`default-light` is the one palette in the table with two rungs, and no amount of mapping gives it a
third: `surface` is `#f7fafb` and the ceiling is white. There is ΔE00 1.80 of headroom in total.
**On a light theme, elevation cannot be carried by ground lightness.** This is why every light-mode
system — Material, Apple HIG, Fluent — carries elevation with shadow and a hairline border, and
reserves lightness-as-elevation for dark mode. It is not a border doing an elevation's job; **on a
light ground, the border is how elevation is done.**

So the rule, which I would like written where the next person finds it:

> **Elevation is carried by ground lightness on dark themes and by border and shadow on light
> themes.** Dark themes have three rungs — `background`, `surface`, `surfaceRaised` — and a raised
> element needs no border to be read as raised. Light themes have two, and a raised element carries
> a 1px `borderStrong` hairline and its shadow. `surfaceRaised` must be strictly above `surface2`
> on every theme; `surface2` and `surface3` sit between `surface` and `surfaceRaised` and are
> never one side of an elevation pair on their own.

Your `borderStrong` indicator is therefore **correct on light and a stopgap on dark.** Once the
homage mapping is fixed, the indicator on dark themes should drop the border and read by lightness —
which is also the point at which "several components should be revisited together" stops being
true, because they will all be sitting on a ladder that works.

### The related `primaryStroke` finding is by design, not a gap

`primaryStroke = primaryFill` on 10 of 23 is spec line 125, verbatim: *"Equals `primaryFill` when
the fill already passes."* And `primaryStroke` clearing 3:1 against `primaryFill` on one theme is
expected — it is derived against the three surfaces, never against the fill. A mark painted *on* a
filled control takes `primaryOnFill`; that is what the token exists for. Rule 8 already removes the
case where it would matter.

---

## 2. The selected dropdown row — confirmed. Check and `primary-text`, no fill.

**Yes, this is the right read, and not only because rule 8 forced it.** A check mark at the leading
edge with the label in the primary text colour is the dominant convention for a selected option —
macOS, iOS, Material's menus, Radix — and the edge-to-edge fill was Mantine's quirk rather than a
standard. A selected option needs to be *findable*, not *loud*; the user already chose it. The check
carries selection without colour, `primary-text` reinforces it at 4.54 worst, and the row's ground
never moves, so nothing is measured against a ground it was not audited on. Reusing the menu's
vocabulary is the right instinct.

**Do not take the 6px-padding route.** It satisfies rule 8 at the cost of a selected row that no
longer runs edge to edge, which is a third look that nobody designed.

**One geometry check, because two marks now share the leading edge.** The rail (3px, on highlight)
and the check (on selection) both live at the left. When the highlighted row *is* the selected row,
both paint. The rail is the outermost thing and the check must sit clear of it — the check's
leading edge should start where a normal row's padding starts, not at the rail. Send me a capture of
a highlighted-and-selected row rather than my specifying pixels blind; this is the kind of thing I
got wrong last time by inferring.

---

## 3. The toast — keep the edge. Column, not deck. Dialog is fine.

**Keep the 4px leading edge.** Rule 5 says a role-coloured mark cannot be *the* signal, and here it
is not: the glyph is. A redundant colour cue beside a non-colour signal is exactly what 1.4.1
permits, and on a toast specifically it earns its place — toasts land in peripheral vision, where a
block of role colour reads before a 20px glyph can. The glyph carries the meaning for anyone who
looks and for every CVD user; the edge carries it for the corner of the eye. Right division.

It also does not touch P79-C: the edge is neither ground nor ink. And it is drawn in the role's
*text* colour, which is audited at 4.5:1 and so clears the 3:1 a mark needs with room.

**Column, not deck — agreed, and for your reason.** A partial-opacity second toast is an unmeasured
ground under measured ink. Newest nearest the screen edge is the right order.

**`surface` ground with `borderStrong` and shadow** is correct on light themes and will be correct
on dark once §1's mapping is fixed; until then the border is doing the work on the homage themes and
that is fine.

**The confirmation dialog** — cancel then confirm, confirm filled in the caller's tone, glyph
declined because the label names the action: nothing to change. One thing to carry forward from
question 4: a *danger* confirm is exactly the control where the label ("Delete") is the role word,
so declining the glyph there is right and should stay right after the default widens.

---

## 4. `filled` — yes. Same rule, same three components, same opt-out.

**Widen it.** The argument that eliminated the role-coloured rail is the argument here: 2.7 under
protanopia at full chroma is above the wash's 0.00 and still below the threshold anyone can see. A
`filled` badge reading "Tier 2" has the same defect as the `light` one did, less severely, and "less
severely" is not a pass. "Louder" is about visibility, not distinguishability — two loud things that
look the same are still the same.

Keep your existing scope of **status tones only** — success, warning, error, info. `primary` is not
a status and gets no glyph. The glyph on a filled control draws in the on-fill ink, so it is still a
silhouette and the silhouette test still holds.

The visible consequence — every status-toned filled button gains a leading glyph at Phase 81 —
is a change R has agreed to as part of the refresh, and it is a strong, conventional look. The
opt-out handles the cases that genuinely do not want it.

---

## 5. The rail under keyboard focus — suppress it. Option 2.

**Suppress the rail under `:focus-visible`.** Three reasons, the first of which is a measurement
rather than a preference:

**The rail breaks the ring.** The inset ring's outermost band is the halo (your question 6, and you
were right). The rail is 3px of `primary-stroke` on the leading edge. When both paint, the rail
*covers the halo band on that edge* — so on the leading edge the ring's two-tone pair is gone and
the core is hard against the rail in the same colour. "The ring with a heavier leading edge" is
the ring with its guarantee removed on one side.

**It is a third look nobody designed.** Rail-alone and ring-alone are both specified and both
measured. Rail-plus-ring is a composite that exists because of how Base UI sets a data attribute.

**One mark per input mode.** Pointer → rail. Keyboard → ring. The rail's job was findability,
and under keyboard the ring already outlines the whole row; the rail adds nothing there.

Agreed on not taking option 3 — the ring is the audited indicator and the rail is not.

---

## 6. The inset band order — yours is right, my snippet was wrong.

**Halo, core, halo reading inward.** You read it correctly as a slip. The outset ring reads halo /
core / halo from the edge outward — that is the pixel scan from September 14 — and its inward mirror
is halo / core / halo. The outermost band's job is to separate the core from whatever is adjacent,
and on a flush element what is adjacent is the neighbouring row or the container edge. Core-first
would have put the core against the neighbour, which is the exact thing the halo exists to prevent.
Keep what you built.

---

## 7. Where things stand

| | |
|---|---|
| **Q1 Elevation** | Three rungs on dark by design; two + hairline on light, structurally. On the homage ports `surfaceRaised` is pinned to the same grey as `surface2` — measured live on gruvbox. One token per theme. Also sweep `border == surfaceRaised`. |
| **Q2 Selected row** | Confirmed. Check + `primary-text`. Send a capture of highlighted-and-selected. |
| **Q3 Toast** | Keep the edge. Column. Dialog fine. |
| **Q4 `filled` glyph** | **Yes.** Status tones only. |
| **Q5 Rail under focus** | **Suppress.** It covers the ring's halo on the leading edge. |
| **Q6 Band order** | Yours. Halo / core / halo inward. |
| WordPress.org handle | `astragal`, registered. Closed, thank you. |
| Standing rules → `COLOR-SPEC.md` | Waiting on R's archive-before-change. |
| **Final asset cut** | **Mine, and owed.** See below. |

### The asset cut

R asked me directly what the outstanding question is. **There is not one.** The geometry, the
palette, the Freemius crop, the 16px proof and the typography were all locked on September 9, and
in that same note I wrote that I was cutting the final icon, banners, lockups, favicon and
placeholder. The focus-ring thread started the next morning and I never did. On the 14th I listed
it as if it were waiting on someone else, which was wrong — it was waiting on me. I am cutting them
now, against the restored sources, and they will come to R's folder as a single set with a contact
sheet at every shipped size.

Nothing in the six questions above touches them: the brand assets live on the brand palette, which
the theme system never sees.
