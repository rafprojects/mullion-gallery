# The reversal is built, and none of the thirteen needs a lift

**From:** engineering
**Date:** 2026-10-07
**Reply to:** `designer-reversal-elevation-2026-10-07.md`

Your reversal is built as you specified it. I checked your figures first, and every one
reproduces: gruvbox's stroke at 9.04, crimson-canvas's success text at 11.05, catppuccin-mocha's
primary text at 6.80, gruvbox's 5.93 and 6.07 steps, and `#433e3b` for its re-derived `surface2`.

---

## The list you asked for

**All thirteen dark homages keep their rung.** `surface` to authored `surface2` is at least ΔE00
3.39 on every one: darcula 3.39, nord 3.42 and solarized-dark 3.48 are the tightest, and tokyo-night
is the widest at 11.38. The full list is in `elevation-token-table-reversed-2026-10-07.md`. The 1.31
at the low end of the range in my 2026-10-02 table was solarized-light, a light theme, which is why
it looked as though at least one dark theme would need the lift. None does.

So no bundled theme takes branch 3. The lift and its stop survive, unchanged, as the fallback for a
user-authored theme with no rung of its own.

## What moved, against what shipped before P80-G

| Token | Where |
|---|---|
| `surfaceRaised` | the 8 light homages, to `surface` (your Decision 1, kept) |
| `surface2`, `surface3` | the 13 dark homages, re-derived as the intermediates |
| `border` | catppuccin-mocha, gruvbox-dark, tokyo-night and midnight-rose only |

**`primaryStroke`, `borderStrong`, `focusHalo` and every role text rung are unchanged on all 23
themes.** Darcula's rail is back at 3.67 and nord's at 3.52. Every audit passes, and the tightest
`border` pair is midnight-rose at 3.51.

One cost is wider than your note put it. `surface2` paints more than an input fill and a table
stripe: it is also the chip, the keyboard key, the loading skeleton, the subtle button's hover, and
Mantine's switch track. On the live gallery the visible change is the search field and the filter
chips in the top bar, both a step darker on the dark homages. All of it is neutral, as you said. I
read the screenshot diffs side by side and nothing chromatic moved.

## The spec

Archived as `archive/2026-10-07-pre-elevation-reversal/`, and the engineering note under rule 13
rewritten to describe the reversed resolution. It opens with your sentence, filled in: on the
bundled dark homages the step from `surface` to `surfaceRaised` is already at least ΔE00 2.0 on all
thirteen, and the collision was `surface2`, not the ladder. No rule's text changed, and rule 14 keeps
the wording you approved.

## The two-tone rail

Filed as a future task rather than built. It only matters for a theme that takes the lift, and no
bundled theme does, so there is nothing yet to measure it against. The entry says it has to be
validated on a user-authored theme that actually needs a lift before anyone builds it.
