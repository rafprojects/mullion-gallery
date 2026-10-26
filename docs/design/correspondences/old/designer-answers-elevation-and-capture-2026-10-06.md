# Both elevation decisions, a dependency P80-G creates, and the captures are not in Inter

**2026-10-06.** Reply to `elevation-followup-2026-10-02.md` and `selected-row-capture-2026-10-03.md`.

**Decision 1: option 1.** On a light theme that does not author `surfaceRaised`, it resolves to
`surface`. **Decision 2: yes, a rule.** `border` must sit at least ΔE00 3.5 from every ground it can
be drawn on, and the engine steps it when an authored value does not.

And three things the captures and the elevation change raise between them. One is a dependency you
have not connected yet. One is a probable production defect that is visible in your own captures.

**On the attribution:** you are right and I was wrong — the engine pinned `surfaceRaised`, not the
ports. I read a resolved value and inferred the cause, which is the same move I have made before.
What saved it is that I also said *check each JSON rather than taking that from me*, and you did.

---

## 1. Decision 1 — `surface`, and why not a step toward white

Option 2 looks closer to my defaults, so the reasons matter:

**It synthesises a colour the palette never published.** Several light homages are warm — Solarized
Light's lightest neutral is a cream, not white. A step "toward white" from a cream surface lands on a
cool off-palette colour. That is the same fidelity argument that rejected option A in September:
Nord should stay Nord, and Solarized Light should stay Solarized Light.

**What it would buy is below the threshold anyone can see.** My own `default-light` lift,
`#f7fafb` → `#ffffff`, measures **ΔE00 1.80** — under the 2.0 at which a difference is noticeable side
by side. Option 2 would spend palette fidelity on a step that my own default does not visibly make.

**Rule 13 already says where light elevation lives:** in the `borderStrong` hairline and the shadow.

**Authored values still win**, so `default-light` keeps `#ffffff` and any author who wants a lift
can have one.

### What I would replace the fallback with

Rather than specify the code, here are the invariants to test. Write the resolution any way that
satisfies them:

- **Authored `surfaceRaised` always wins.**
- **Dark theme, unauthored:** the next authored rung above `surface2` — `surface3` on all 13 dark
  homages. If a theme authors no rung above `surface2`, derive one with the same mechanism that
  derives `surface2` and `surface3`. **Invariant:** `surfaceRaised` is lighter than `surface2` by
  ΔE00 ≥ 2.0.
- **Light theme, unauthored:** `surface`. **Invariant:** `surfaceRaised` is never darker than
  `surface`.

### Rule 13 has a sentence that is wrong for light homages, and it is mine

> *"`surface2` and `surface3` sit between `surface` and `surfaceRaised`"*

That is true on `default-light`, where they step toward white (`#fafcfc`, `#fcfdfe`). It is false on
the 8 light homages, where they step darker to recess input fills. Both are fine conventions — a
white input on a grey panel and a recessed input on a white panel are equally standard — but my
sentence makes the homages violate the rule. Under option 1 the clause that does the work still
holds on every theme: `surfaceRaised` (= `surface`) is above `surface2`. Replacement text, for the
next archive-and-edit of the spec:

> `surfaceRaised` must be strictly above `surface2` on every theme. **On dark themes** `surface2` and
> `surface3` sit between `surface` and `surfaceRaised`. **On light themes** they may instead recess
> below `surface`, as input fills; `surfaceRaised` must never be darker than `surface`. Neither is
> one side of an elevation pair on its own.

---

## 2. Decision 2 — a floor for `border`, anchored to what the defaults already ship

**Yes to a rule, and it should not be "differ from every rung".** "Differ" means ΔE00 0.01 passes.
The floor should be what the default themes already accept, so it is not a number I invent:

| default theme | `border` on its tightest ground | ΔE00 |
|---|---|---|
| default-dark | `#22414f` on `surfaceRaised` `#1a3542` | **3.84** |
| default-light | `#cddadb` on `background` `#e9eef1` | 6.20 |

**Floor: ΔE00 3.5** — just under the tightest value we ship, so the defaults pass with margin and the
rule is not tuned to catch them. ΔE00 rather than a contrast ratio because `border` is decorative and
exempt from 1.4.11; this is visibility rather than compliance, which is what rule 10 is for.

**Why it matters, using your own captures:** the menu divider between "second item" and "delete" is
drawn in `border` on `menu-bg`. Wherever `border == surfaceRaised`, **that divider is not drawn.** That
is true today on gruvbox-dark and catppuccin-mocha, and it will be true on cyberpunk and nord the
moment P80-G lands. It is not a hypothetical edge case; it is a line that disappears from every menu
on four themes.

**The mechanism:** the same one `deriveBorderStrong()` uses, with a lower floor. When an authored
`border` falls under ΔE00 3.5 against any ground it can be drawn on, step its lightness away from the
grounds — lighter on dark themes, darker on light — holding hue, until it clears all of them. **Stop
before it reaches `borderStrong`**; the defaults keep the two ΔE00 23–24 apart, and they have different
jobs. If there is no room between the grounds and `borderStrong`, fail CI and name the theme rather
than let the two collapse.

**Move `border`, never the ladder.** The ladder is structure; `border` is the decoration that has to
fit around it. And the step only fires on a collision, so Nord's `border` moves only on Nord, and only
as far as it must.

---

## 3. The dependency: P80-G moves the only keyboard mark on three components

Your note about the rail staying on the searchable `Select`, `MultiSelect` and `TagsInput` is right,
both halves. Suppressing it on a component whose options never take focus would leave the keyboard
with nothing.

**But it makes the rail a focus indicator on those three components**, so it answers to 1.4.11:
3:1 against `menu-bg`. Today on `default-dark` that is **3.19** — `primaryStroke` `#008e85` on
`#1a3542` — and that is a thin margin.

P80-G makes `menu-bg` lighter on 13 dark themes, so `primaryStroke` loses contrast against it on
exactly those themes. Because `primaryStroke` is selected against `surfaceRaised`, the engine will
re-select it where it fails — **and `primaryStroke` is the focus ring's core, everywhere.** So a menu
elevation fix can move the focus ring on any of those 13 themes.

That is fine if it happens, but it is the thing to look at. **In the before/after table, please include
`primaryStroke` and its ratio on the new `menu-bg` for all 23 themes, and flag every theme where
`primaryStroke` changes.** Those rows are the ones I would read first.

---

## 4. The captures — verified, and the check spacing stays

Scanned at 1×, both themes:

```
rail            x 1–3,  3px, #008e85 / #006e66                ✓
inset ring      halo / core / halo inward, 2 / 2 / 2
                #edf5fb #008e85 #edf5fb  ·  #101416 #006e66 #101416   ✓
plain Select, keyboard    ring only, no rail                  ✓
searchable, keyboard      rail kept                           ✓
check           visible ink from x 16  → 12px clear of the rail
label           starts x 39 in every row, selected or not
```

**Keep the gap.** 12px of clear space reads as two separate marks rather than one. And keep what the
captures show without comment: **the check gutter is reserved on every row**, so labels never shift
sideways when the selection changes. That is easy to get wrong and it is right.

---

## 5. The captures are not in Inter — the colours crossed the portal and the type did not

Every label in all ten captures is set in a **serif** — the browser's default face. The interface
face is Inter. The tokens are correct throughout, so the styles reached the popup; the typeface did
not.

That pattern has an obvious cause. You noted in September that every popup portals out of the
gallery's shadow root to `document.body`. If `font-family` is set on an element *inside* the shadow
root, a portaled popup never inherits it. It inherits whatever `body` has — nothing in a bare
harness, hence the serif.

**On a WordPress site that means the popup is set in the host theme's body font.** Someone running a
theme with a serif or display body face would get dropdowns in that face, inside an otherwise-Inter
gallery.

It could also be harness-only. **The check that separates the two:** on the live site, open a
`Select` and compare `getComputedStyle(option).fontFamily` with a label inside the gallery. Then
repeat with a WordPress theme whose body font is a serif. If they differ, the fix is to set the
font-family on the portal container itself, in the same place the colour variables are carried
across.

I would put this ahead of the ellipsis question, because it changes what the ellipsis question is
measured in.

---

## 6. Long labels — option 3, with wrapping beyond the maximum

**The truncation is real, not a font artefact.** The label column is about 79px (130px popup, label
starting at 39, 12px right padding). "Administrator" in Inter at 14px is **88.7px**, so it truncates
in the right font too.

**Option 3, specified:**
- the popup's **minimum** width is the field's width;
- it **grows** to fit its longest label;
- its **maximum** is `min(24rem, viewport − 16px)`.

**Beyond the maximum, wrap — option 2 — rather than ellipsis.** A list you choose from should never
hide part of a choice. A wrapped row keeps its check aligned to the first line, and the reserved
gutter keeps the continuation lines in the label column.

The **closed field** keeps its ellipsis for a long value. That is option 1, and it is correct there,
because the full value is one click away.

---

## 7. Question 4 — noted

So the glyph had defaulted on every variant since P80-A. You described what you believed rather than
what the code did, then measured and corrected it — which is rule 11 doing its job. Pinning it with a
test is the right outcome.

---

## Where it stands

| | |
|---|---|
| **Light `surfaceRaised`** | **`surface`** when unauthored. Never darker than `surface`. |
| **Dark `surfaceRaised`** | Next authored rung above `surface2`, derived if none. ≥ ΔE00 2.0 above it. |
| **Rule 13 text** | One sentence is wrong for light homages — mine. Replacement above. |
| **`border` floor** | ΔE00 3.5 against every ground; step `border`, never the ladder; stop short of `borderStrong`. |
| **P80-G table** | Add `primaryStroke` on the new `menu-bg`, all 23. Flag every theme where it moves. |
| **Check spacing** | Keep. The reserved gutter is right. |
| **Popup typeface** | Serif in the captures. Run the check in §5 before anything else in the popups. |
| **Long labels** | Grow to fit, then wrap. Closed field keeps its ellipsis. |

Nothing here waits on me. P80-G can proceed on §1 and §2, and I am ready for the table.
