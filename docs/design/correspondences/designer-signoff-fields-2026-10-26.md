# Fields and slider approved. The off thumb is `textMuted`, as you proposed.

**2026-10-26.** Reply to `fields-moved-2026-10-26.md`.

I checked the crop against rules 18 and 19 and it matches both. The two catches matter more than
anything in my letter. A field that ignored its call site's `aria-label` would have been invisible
to a sighted reviewer. "1,200" in a pixel field would have been copied into CSS somewhere. Good to
find the muted label's real source too: the adapter, not a call site, so every number and colour
field was affected and not just one.

---

## 1. The off switch: `textMuted` thumb. Approved.

Your diagnosis is right, and the crop shows it on both defaults, not only on light. On dark, the off
thumb is `#102530` on a `#132a36` track, which is just as empty as the light one. An outlined pill
tells you there is a switch but not which way it is set, and position is the one state signal it has
that does not depend on colour.

I checked your choice against the disabled thumb, which is the comparison that matters:

| default theme | off thumb on its track | disabled thumb on its ground | off thumb vs disabled thumb |
|---|---|---|---|
| light | 5.27:1 | 3.12 | ΔE00 11.4 |
| dark | 6.88 | 4.50 | ΔE00 17.8 |

So an off switch and a disabled one now differ four ways: thumb ink, track ground (raised vs
recessed), edge, and label ink. That is enough. Your reason for not using `borderStrong` is right:
it would leave those two states differing only at their edges, and the disabled state is meant to be
told apart at a glance.

The thumb stays the same size in both states. Its position carries the state, and a thumb that
also grows when switched on adds an animation without adding information.

Add one line to rule 18 so the switch is specified the way the slider is: **off: `textMuted` thumb on
the track's ground. On: `primaryOnFill` thumb on `primaryFill`, edge `primaryStroke`. Disabled:
rule 16.**

---

## 2. The follow-ons

The `xs` label row being 3px tighter and the text area keeping the framework's padding are both
fine as they are.

**The password reveal button**, when its turn comes: the eye and the eye with a slash. Those are the
icons people recognise for this, and a glyph has to be learned. Give it the accessible name "Show
password", `aria-pressed` to report its state, and a 24px target. It sits inside the field, so the
spacing exception that let the slider's row pass does not cover it.

**The access-request email field** taking the one field look is right. A visitor seeing the same
field there as on every other form is the point.

---

## 3. Where it stands

| | |
|---|---|
| Fields | Approved. Rule 19. |
| Slider | Approved. Rule 18. |
| Switch, off | `textMuted` thumb. Add the switch's three states to rule 18. |
| Disabled switch and checkbox | Approved. Good catch on the leftover 60%. |
| Password reveal (follow-on) | Eye and eye-off icons, "Show password", `aria-pressed`, 24px. |

Nothing open on my side.
