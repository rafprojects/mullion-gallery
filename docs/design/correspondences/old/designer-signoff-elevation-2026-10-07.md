# Signed off. The reversal reproduces exactly, and the ladder is clean.

**2026-10-07, later.** Reply to `elevation-reversed-2026-10-07.md` and
`elevation-token-table-reversed-2026-10-07.md`.

**Signed off.** Nothing chromatic moved on any of the 23 themes, and I checked the part of the
reversal that was mine to check.

---

## Verified

**The re-derivation is the spec's interpolation, to the byte.** I recomputed `surface2` at one third
and `surface3` at two thirds of the LAB path from `surface` to `surfaceRaised` on six dark homages —
gruvbox, nord, tokyo-night, catppuccin-mocha, darcula, crimson-canvas. **ΔE00 0.00 from your values
on all twelve.** The engine is doing exactly what `COLOR-SPEC.md` §1 says `surface2` and `surface3`
are.

**The list answers the question, and corrects an inference of mine.** All thirteen dark homages hold
their rung at ΔE00 3.39 or better. The 1.31 in your October 2 range that made me say *"at least one
dark theme takes branch 3"* was solarized-light — a light theme in a mixed range. I read the range
without reading the row. None of the bundled dark themes needs a lift.

**The `border` floor landed where it should**: four themes, all neutral, tightest pair 3.51. The
dividers that were invisible on gruvbox and catppuccin-mocha are drawn.

**`surface2` painting more than I said — correct, and correct by design.** Chips, keyboard keys,
skeletons, subtle hover, the switch track, the search field and the filter chips: all of them are the
*"fractionally off the panel"* surfaces `surface2` was specified for. On the dark homages they step
from a full rung up to a third of one, which is what the spec meant and what `default-dark` already
does. You read the diffs and nothing chromatic moved; that is the test.

---

## Two notes, neither blocking

**Builder panels and menus sit close on two themes, and that is expected.** With a rung of ΔE00 3.4
split into thirds, `surface3` lands ΔE00 1.13 below `surfaceRaised` on nord and 1.01 on darcula — so
a builder panel and a popover over it are near enough to one colour on those two. That is what rule
13 already says: `surface2` and `surface3` are intermediates, *"never one side of an elevation pair
on their own."* A popover over the builder reads as raised by its hairline and shadow on those
themes, which is the light-theme mechanism applied where a dark theme runs out of room. Nothing to
change; worth knowing the next time someone sees a builder popover on nord and reaches for a token.

**One sentence in the branch-3 logic I would pin down.** The note says a theme with no rung is
*"lifted instead, toward `surface3`."* After the reversal, `surface3` on a dark theme means the
*derived* intermediate — which, in branch 3, has not been derived yet, because `surfaceRaised` is
what the branch is finding. I assume the lift targets the theme's **authored** `surface3`, and the
intermediates are re-derived afterward from the result. If that is what the code does, one word in
the note — *authored* — removes the ambiguity. No bundled theme exercises the branch, so this is
for the next person and the first user theme that does.

---

## The two-tone rail

Filed with the right precondition. It exists to protect the accent from a ground change on a theme
that takes the lift, and until a theme takes the lift there is nothing to validate it against. Leave
it filed.

---

## Where it stands

| | |
|---|---|
| Dark homages | Rung kept, intermediates re-derived. **Zero chromatic moves.** |
| Light homages | `surfaceRaised` = `surface`. Kept. |
| `border` floor | Four neutral moves. Kept. |
| Rule 13 note | Correct. One word to add: *authored* `surface3` in the lift branch. |
| Rule 14 | Unchanged, as approved. |
| Two-tone rail | Filed, gated on a theme that needs it. |
| Open | Nothing. |

That closes the elevation thread. Three documents, one reversal, and the palette is where it was on
September 9 — which, for the second time this engagement, turns out to be the measure of whether a
change was right.
