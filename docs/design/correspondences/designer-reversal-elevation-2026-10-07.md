# The table did its job: it shows my dark-theme decision was wrong, and I am reversing it

**2026-10-07.** Reply to `elevation-built-2026-10-07.md` and `elevation-token-table-2026-10-07.md`.

You said on the 2nd: *"no signed-off colour moves" is something I want to show you rather than
assume.* You showed it, and it is not true. **P80-G repaints the accent on ten dark homages and
the role text on twelve, at the magnitude I rejected as option A in September.** The lift was my
instruction, given without the one number that would have told me it was unnecessary. I have that
number now, from the live site, and the cheaper fix is the one the spec already describes.

Everything else you built stands. The reversal is one branch of the resolution.

---

## 1. What moved, in the unit that matters

Your table says *what* moved. Here is *how far*, CIEDE2000, from the values in it:

| `primaryStroke` — the ring core and the rail | | |
|---|---|---|
| gruvbox-dark | `#f97b0d` → `#ff9c5e` | **9.04** |
| crimson-canvas | `#f7453e` → `#ff7064` | 8.32 |
| halloween | `#b66200` → `#d37300` | 7.73 |
| material-dark | `#915bcd` → `#a570e4` | 7.66 |
| midnight-rose | `#e10b5c` → `#f93570` | 7.56 |
| cyberpunk | `#dd007c` → `#f92490` | 7.43 |
| high-contrast | `#2b82bc` → `#4397d2` | 7.42 |
| solarized-dark | `#3496de` → `#4cabf4` | 6.50 |
| tokyo-night | `#79a1f6` → `#95b8ff` | 6.42 |
| catppuccin-mocha | `#7aa4e9` → `#8fb9ff` | 5.92 |

| role text, the largest | | |
|---|---|---|
| crimson-canvas `success-text` | `#22c087` → `#5fecb1` | **11.05** |
| solarized-dark `error-text` | `#ff988c` → `#ffbab1` | 8.53 |
| catppuccin-mocha `primary-text` | `#8fb9ff` → `#b2cfff` | 6.80 |
| halloween `primary-text` | `#e38b40` → `#ff9e4a` | 6.20 |

**Option A in September was a median of 7.7 and a maximum of 9.3, and I rejected it because it moved
eleven homage themes visibly off the palettes they are named after.** This is the same magnitude, on
the most identity-bearing token there is — gruvbox's orange has become a peach — and on the role
text, which is the next most. The route was different; the cost is the one I said we would not pay.

`elevation-cost-gruvbox-2026-10-07.png` is the same menu three ways. The middle one is P80-G.

---

## 2. Why the lift was unnecessary: the rung was already there

On the 2nd I read gruvbox's resolved tokens off the live site. I used them to find the `surface2 =
surfaceRaised` collision and did not use them for the one thing that mattered:

| gruvbox-dark, live, before P80-G | ΔE00 |
|---|---|
| `background` → `surface` | 5.93 |
| **`surface` → `surfaceRaised`** (the `?? surface2` fallback, = bg2) | **6.07** |

**That is a rung — three times the threshold.** The menu already read as raised. The ladder
`background` / `surface` / `surfaceRaised` was already three distinguishable steps on gruvbox before
anyone touched it. **The 0.00 was never a missing rung. It was `surface2` sitting on top of the rung
that existed.** And `surface2` is, by the spec's own definition, an *intermediate inside* the
`surface` → `surfaceRaised` step — which on these themes it was not, because the port authored it as
the rung itself.

So the defect has two possible fixes, and I picked the expensive one:

- **Lift `surfaceRaised` above `surface2`** — moves the ground every chromatic token is selected
  against, and the cascade in §1 follows. *(P80-G.)*
- **Pull `surface2` back down to the intermediate the spec says it is** — moves an input fill and a
  table stripe, both neutral, and nothing else.

Tested on gruvbox: derive `surface2` as the LAB interpolation `surface` → `surfaceRaised` at a third,
and it lands on `#433e3b` — ΔE00 2.14 above `surface`, 3.95 below `surfaceRaised`. The collision is
gone. `surfaceRaised`, `primaryStroke`, every role text, `borderStrong` and the halo all stay exactly
where they were. The only thing that still moves is `border`, under rule 14, because it was authored
equal to the ground — and that move is a neutral and the divider it makes visible is the thing that
was actually broken.

### The resolution I should have specified

For a dark theme that does not author `surfaceRaised`:

1. **Take the fallback value as it stands today** — authored `surface2`, the rung.
2. **If `surface` → that value is ΔE00 ≥ 2.0, it is `surfaceRaised`.** Then **re-derive `surface2`**
   as the interpolation the spec describes, so it stops coinciding with the ground above it.
   `surface3` likewise, one stop further. Nothing chromatic moves.
3. **Only if the step is under 2.0** does the theme need a lift — and there your P80-G logic, stop
   included, is exactly right. Its chromatic cost is then confined to a theme whose palette genuinely
   has no rung there.

Your table from the 2nd put `surface → surface2` at 1.31–11.38 across the homages, so **at least one
dark theme is under 2.0 and takes branch 3.** I only hold gruvbox live. **Please run `surface` →
authored-`surface2` ΔE00 across all 13 dark homages and tell me which fall under 2.0.** That list is
the whole extent of where the lift should apply.

---

## 3. What this does to the three open points

**§1, the three stops — moot where the rung keeps.** Catppuccin-mocha, tokyo-night and gruvbox stop
short of `surface3` because role text cannot clear 4.5:1 on it; under branch 2 none of them goes
near `surface3`. For any theme that genuinely takes branch 3, **the stop is acceptable, and here is
the principle rather than the case:** a homage theme's identity lives in its chromatic tokens, not
in which of its five greys the menu sits on. An off-palette *grey* is a cheap cost. An off-palette
*accent* is the expensive one. The stop pays the cheap one to avoid the expensive one, which is the
right trade in that direction only.

**§3, `primaryStroke` — a finding worth having even though it goes moot.** I checked whether the
*old* core would have survived on the new menu ground as a two-tone pair with the theme's halo. On
**seven of the ten** it would: material-dark, solarized-dark, high-contrast, cyberpunk,
crimson-canvas, halloween, midnight-rose all keep a halo at 7.5–12.8:1 on the new ground. The ring
never needed the core to move. **What moved it is the single-tone criterion** — `primaryStroke`
must clear 3:1 *alone* against `surfaceRaised`, because the rail has no halo. The ring was designed
with a halo precisely so the accent never has to move for a ground; the rail transmitted the ground
change straight into the accent because it lacks one. If any theme ends up in branch 3, the thing to
reach for is a two-tone rail, not a lighter accent. The three where the pair *does* fail are the
three stop themes — same three, same dark-halo reason as in September — and under branch 2 they
never see the new ground.

**The four at 3.00–3.07 — compliant, and they recover.** Darcula and nord did not move their stroke;
the ground rose under it. With the ground back, darcula returns to 3.67 and nord to 3.52. I hold
to what I said in September: 3.00 on exact hex values is as compliant as 6.59. It was never the
problem. The problem was what it cost to get there.

**§2, the `border` floor — keep it exactly as built.** Eight moves under P80-G; under branch 2 the
four caused by the lift go away and the four that were real stay: catppuccin-mocha and gruvbox
(authored equal to the ground), tokyo-night (2.04) and midnight-rose (2.87). All neutral, all lighter
with hue held, all under `borderStrong`. The divider in your own capture gets drawn on four themes
where it is not drawn today. That was the point.

---

## 4. The spec

**Rule 14 says what I meant.** Keep the wording.

**Rule 13's text is right; its engineering note describes P80-G and will need the branch-2 version**
once you have the list from §2. I would also add one sentence to the note, because it is the thing
that would have stopped me: *"On the bundled dark homages `surface` → `surfaceRaised` is already
≥ ΔE00 2.0 on all but [n]; the collision was `surface2`, not the ladder."* The next person to look at
a 0.00 should know which token to suspect.

---

## 5. The rest, briefly

**The typeface — you are right and I was one step out.** The selects stopped portalling in P80-F; the
overlay root inherits from `body`, so the exposure was modals, drawers, confirms and toasts, not
dropdowns. The fix is in the right place, and a test on a page whose body font is not Inter is the
right test. The production concern was real; the component I pinned it on was wrong.

**Long labels — built as specified.** Nothing to add.

**The segmented control on the ladder, and `raised-bd`** — `borderStrong` on light, transparent on
dark — is rule 13 applied correctly. With branch 2 the track-on-`surface`, indicator-on-`surfaceRaised`
pair is ΔE00 6.07 on gruvbox, which is what I told you to build it on in the first place.

---

## 6. Where it stands

| | |
|---|---|
| **Dark `surfaceRaised`** | **Reversed.** Keep the fallback value where `surface` → it is ≥ 2.0; re-derive `surface2` and `surface3` as intermediates. Lift only under 2.0. |
| **Needed from you** | `surface` → authored-`surface2` ΔE00, all 13 dark homages. |
| Light `surfaceRaised` | Keep. |
| `border` floor, rule 14 | Keep. Four real moves, not eight. |
| Stop logic | Keep, as the branch-3 fallback. |
| Two-tone rail | Consider for any branch-3 theme, before moving its accent. |
| Typeface, long labels, segmented control | Keep. |
| Rule 13 note | Rewrite once the list is in. |

---

**On the error.** I wrote *"no engine change, no derivation change, no signed-off colour moves"* on
the 2nd and specified the dark invariant on the 6th — and in neither did I check the one number I
already had, the live step from `surface` to the fallback. I predicted `primaryStroke` would move
and missed that role text would, which is the larger of the two. You said you would show rather
than assume; the table is the showing, and it caught a repaint of twelve themes before it reached
a user. That is the method working, and it is the second time this engagement that the cost of a
"small" change was only visible once someone measured every token it touched. Worth remembering
the next time either of us says *one value per theme*.
