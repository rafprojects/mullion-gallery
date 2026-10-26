# Both decisions built, the table you asked for, and three themes where `surface3` could not be the ground

**From:** engineering
**Date:** 2026-10-07
**Reply to:** `designer-answers-elevation-and-capture-2026-10-06.md`

Everything in your answers is built: the raised ground, the `border` floor, the rule 13 text, the
popup typeface and the long labels. The table is in `elevation-token-table-2026-10-07.md`, with
`primaryStroke` and its ratio on the new menu ground for all 23 themes, and the moved ones marked.
Three things in it need your eye. The first is a place where I could not follow your invariant
literally.

---

## 1. On three dark homages the ground stops short of `surface3`

Your invariant was `surface3` on every dark homage. On ten of the thirteen that is what ships. On
three, `surface3` is a mid-tone, too light to carry role-coloured text: the lightest rung of each
role's ramp falls under 4.5:1 on it.

| Theme | Role text on `surface3`, worst to best | Where the ground stops | ΔE00 above `surface2` |
|---|---|---|---|
| catppuccin-mocha | 4.06 to 4.37 | `#515468`, 65% of the way to `surface3` (`#585b70`) | 4.46 |
| tokyo-night | 3.79 to 4.06 | `#4b5378`, toward `#565f89` | 4.11 |
| gruvbox-dark | 4.00 to 4.22 | `#5d544e`, toward `#665c54` | 4.11 |

The rule as built: `surface3` when it keeps every role's text at 4.5:1 and an authored
`borderStrong` at 3:1; otherwise the highest point from `surface2` toward `surface3` that keeps
both, and never less than your ΔE00 2.0. All three stops sit at least ΔE00 4.1 above `surface2`, so
the step reads. The cost is the one you named in Decision 1: each is a colour between two
published palette colours rather than one of them. The alternative is lighter role text, which
would repaint the roles on those three themes. **Is the stop acceptable, or would you rather these
three author a `surfaceRaised` from their source palettes?**

## 2. The `border` floor moved eight themes, not four

You expected the two collisions today and the two the fix creates. At ΔE00 3.5 the floor also
catches tokyo-night (2.04 today) and midnight-rose (2.87 today), and the lighter menu ground takes
material-dark and darcula under it once it moves.

| Theme | `border` |
|---|---|
| catppuccin-mocha | `#45475a` to `#5c5e72` |
| gruvbox-dark | `#504945` to `#655e5a` |
| cyberpunk | `#2a2a3a` to `#353545` |
| nord | `#4c566a` to `#566074` |
| tokyo-night | `#3b4261` to `#555c7c` |
| midnight-rose | `#333333` to `#454545` |
| darcula | `#515151` to `#5c5c5c` |
| material-dark | `#424242` to `#434343` |

Every step is lighter, with hue held, and none came near `borderStrong`, so no theme fails CI. The
grounds are `background`, `surface`, `surface2` and `surfaceRaised`. `surface2` is in the set
because a striped table paints its odd rows in it and draws `border` across them.

## 3. `primaryStroke` moved on ten themes, and four sit just above 3:1

As you predicted, the lighter menu ground re-selected the ring core on ten dark themes. Every one
clears 3:1 on the new menu ground. These four are the thinnest:

| Theme | `primaryStroke` on menu ground |
|---|---|
| darcula | 3.00 |
| nord | 3.01 |
| crimson-canvas | 3.06 |
| synthwave | 3.07 |

Darcula and nord did not change stroke; their menu ground came up under it. Since the rail is the
only keyboard mark on the searchable `Select`, `MultiSelect` and `TagsInput`, those are the rows I
would read first.

**One prediction did not hold: role text moved.** The role text rungs are selected against every
ground, the menu's included, so twelve dark themes now take a lighter rung for at least one role.
They are listed under the table. Each is a lighter step of the same hue, chosen to hold 4.5:1 on
the new ground, with one exception: tokyo-night's primary text moved by one unit of red
(`#b6ceff` to `#b5ceff`), because that ramp is built from the new `primaryStroke`.

Two smaller engine consequences. `deriveBorderStrong` could not reach 3:1 against the new menu
ground on tokyo-night and crimson-canvas within its search range, so the range was extended; every
other theme's value is identical. And the segmented control now sits on the ladder, as P80-G
specified: the track is `surface` and the indicator `surfaceRaised`. Its hairline is a new token,
`raised-bd`, which is `borderStrong` on a light theme and transparent on a dark one, per rule 13.

---

## The spec

Archived as `archive/2026-10-07-pre-rule-13-revision/`, then rule 13's second sentence replaced
with your text, word for word. **I also added your `border` decision as rule 14**, since it binds
every theme the way the others do. Its wording is mine, assembled from your §2, so please check it
says what you meant. The engineering note under rule 13 now records the stop from §1 above.

## The typeface

Your production concern was right, and your diagnosis of the captures was one step out. Since P80-F
the select popups do not leave the gallery: they open in their trigger's own root. The serif came
from the test page, whose ground sets no font at all, so the gallery's labels were in the same
serif. But a modal, a drawer, a confirm or a toast lives in the overlay root, which inherits from
the host page's `body`, so on a WordPress theme with a serif body face they would have been set in
it. Every popup root now sets the framework font beside its own ground, and a browser test checks
it on a page whose body font is not Inter.

## Long labels

Built as you specified: at least the field's width, as wide as the longest label, capped at
`min(24rem, viewport − 16px)`, and wrapping past the cap with the check on the first line. The
closed field keeps its ellipsis.
