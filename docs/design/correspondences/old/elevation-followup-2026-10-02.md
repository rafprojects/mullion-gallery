# Elevation: you asked me to check each theme's JSON, and it changed the fix

**From:** engineering
**Date:** 2026-10-02
**Reply to:** `designer-answers-catching-up-2026-10-02.md`

Thank you for all six. Everything you answered is being built as one track, P80-G. Questions 2 to 6
need nothing more from you. Question 1 needs two decisions, because checking the JSONs as you asked
turned up something neither of us had.

---

## The cause is the engine, not the ports

**None of the 21 homage themes authors `surfaceRaised` at all.** They author `surface2` and
`surface3`, as you saw on gruvbox, and leave `surfaceRaised` unset. The engine then resolves it in
`resolveColors()` with:

```ts
const surfaceRaised = colors.surfaceRaised ?? colors.surface2 ?? colors.surface;
```

That fallback came in with P74-N and is commented "flatter, safe". So the port did not pin
`surfaceRaised` to `bg2`; the engine did, for every theme that left it out. Your live measurement is
exactly right, only the attribution moves. It also means the fix belongs in the engine rather than
in 21 JSON files, because a user-authored theme goes through the same fallback and would keep the
defect.

## Dark themes: your fix, as written

On all 13 dark homage themes `surface3` is the lighter rung above `surface2`, so resolving
`surfaceRaised` to `surface3` is exactly your gruvbox fix (`#665c54`), applied by the engine. I will
measure every resolved token on all 23 themes before and after and send you the table. The text
rungs, `primaryStroke` and `borderStrong` are all selected or derived against `surfaceRaised`, so
"no signed-off colour moves" is something I want to show you rather than assume.

## Decision 1: what should a raised element sit on, on a light homage theme?

On the 8 light homage themes `surface2` and `surface3` step **darker** than `surface`, the way a
light theme recesses an input. So today the fallback makes a raised menu on catppuccin-latte,
forest-whisper, github-light, material-light, ocean-breeze, reverse-halloween, solarized-light and
sunset-boulevard *darker* than the surface it sits on, and `surface3` would make it darker still.

Your rule 13 says light themes carry elevation by hairline and shadow rather than by lightness, so
the ground matters less there. But the engine still has to pick one. The options I can see:

1. **`surface` itself.** The raised element is the same ground, and the hairline and shadow do all
   the work. Simplest, and it matches "light themes have two rungs".
2. **A step lighter than `surface`**, toward white, the way `default-light` authors `#ffffff` over
   `#f7fafb`. Closer to your two defaults. On `material-light`, whose `surface` is already white,
   it collapses into option 1.

Which do you want, or is there a third I am not seeing?

## Decision 2: `border` collisions, two today and two more after the fix

You expected `border == surfaceRaised` on many themes. Measured from the JSONs, it is **two today**:
catppuccin-mocha and gruvbox-dark, where the authored `border` is the same grey as `surface2`, which
the fallback makes the raised ground. Your fix clears both.

It also **creates two**: cyberpunk and nord author their `border` as the same value as `surface3`,
so once `surfaceRaised` resolves to `surface3`, a 1px `border` on a menu or popover there stops being
drawn.

I do not want to fix that by nudging hex values one theme at a time. Is there a rule, for instance
that `border` on a dark theme must differ from every rung it can be drawn on, and if it is authored
equal to one, the engine steps it?

## Two things for your information, no reply needed

**The rail stays on select options under the keyboard.** I am suppressing it under focus on menu
rows, as you said. A select option is different: it never takes focus, because focus stays in the
input and `aria-activedescendant` names the highlighted option, so on a select the rail is the only
keyboard mark there is. Suppressing it there would leave the keyboard with nothing. Say if you see
it otherwise.

**The standing rules are in `COLOR-SPEC.md` as §8**, rules 1 to 12 verbatim and your elevation rule
as rule 13, with a dated note that the bundled themes do not satisfy rule 13 until P80-G lands. The
copy before the change is archived in this folder under `archive/2026-10-02-pre-standing-rules/`,
in the same dated-folder form as the two archives already there. Your previous copy of the spec here
was behind the repo (it lacked the P77-F focus-halo row), so the live copy now matches the repo.

The capture of a highlighted-and-selected row comes with P80-G.

---

## Correction, same day: the plain `Select` does move focus onto its options

Measured an hour after I wrote the section above, and it was wrong for one of the four. **A plain
`Select` moves real keyboard focus onto its options**, and each option carries the inset ring, so
on a keyboard move a plain `Select` row shows the rail and the ring together, exactly like a menu
row. Your question 5 answer applies to it as written, and I will suppress the rail there too.

What I described is true of the other three: the searchable `Select`, `MultiSelect` and `TagsInput`
keep focus in their text field and name the highlighted option with `aria-activedescendant`. Their
options never take focus, so the rail is their only keyboard mark and it stays.

