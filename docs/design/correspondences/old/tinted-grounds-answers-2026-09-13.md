# Your three questions, answered — and one of them changes your §4

**2026-09-13.** Reply to `designer-response-tinted-grounds-2026-09-13.md`.

**Short version:** D is accepted and it works — I measured it, 137 of 138 pairs clear, and
86 of the 138 need no separate ink at all. Your ΔE request found a real error in my note: my
figures were **CIEDE2000**, not ΔE\*ab, so in your unit the A-repaint is worse than I told you,
not better. And your §4 rests on a premise I gave you badly: the menu's ground **is** audited.
That means §4's projection does not hold and the tint really is the cause — but §5 turns out to
be largely handled already, for a reason neither of us had checked.

Taking your three questions in order, then what changes.

---

## 1. What is the menu's own ground?

`--mullion-menu-bg`, and it derives from `surfaceRaised`.

**It is audited.** The selection routine's ground list is `background`, `surface`, `surface2`
and **`surfaceRaised`** — four grounds, and the menu's is the fourth. Measured on the shipped
engine, the six semantic colours against `menu-bg` untinted:

| | result |
|---|---|
| pairs below 4.5:1 | **0 of 138** |
| worst | **4.53** (solarized-dark, info) |

So your §4 premise does not hold, and that is my fault rather than yours. The column I labelled
`flat` in my note was contrast against `surface` **only**, not against the four-ground list the
selection actually uses. You reasonably read "the ground the colours were selected against" as
covering all of them, and built §4 on the 5.00 worst case it showed. The real worst case on the
menu's own ground is 4.53.

**That 4.53 is the whole mechanism, and it is more interesting than either of us guessed.** The
routine walks the ramp and takes the *nearest* rung that clears 4.5:1. It is not trying to
maximise contrast; it stops at the first colour that passes. So on the tightest theme it lands
0.03 above the floor **by design**. There is no headroom to spend, which is why a 1% tint — which
you correctly show cannot move a 5.00 below 4.5 — moves a 4.53 below it easily.

Your arithmetic in §4 was right. It was applied to a number I mislabelled. The consequence is
that "14 of 23 would clear at 8% on an audited ground" does not follow: they are already on an
audited ground, and 22 of 23 fail. **The tint is the cause after all.**

## 2. Confirm the ΔE unit

**It is CIEDE2000 (ΔE00), not CIELAB ΔE\*ab.** `chroma.deltaE()` implements CIE 2000; I used it
without checking what it computed, and I should have said which it was. You were right to ask,
and right that an unlabelled figure is worse than none.

Recomputed for the 66 colours option A moves, in both units:

| unit | median | max |
|---|---|---|
| CIEDE2000 (what I quoted) | 7.7 | 9.3 |
| **CIELAB ΔE\*ab** (your unit, and your table's) | **11.7** | **24.8** |

So in the unit you were reading, the repaint is about 50% larger at the median and nearly three
times larger at the extreme. **Your magnitude argument does not invert; it strengthens.** A
ΔE\*ab of 24.8 on a Nord semantic colour is not a step along a ramp, it is a different colour.

I will label the unit in `COLOR-SPEC.md` alongside the figures.

## 3. Does the focus ring paint on menu rows today?

**Yes.** Menu items carry the framework's focus attribute, so the ring rule reaches them with no
new work, and I have measured it painting in Chromium under arrow-key navigation: 2px solid core,
the halo token resolving, both halves of the pair present. A pointer hover paints the tint alone,
because the rule is `:focus-visible` — which is the split you would want.

**So §5 is mostly already handled — but not entirely, and the gap is not where you looked.**
Checking the pair against the highlighted row's ground, all 23 themes, 1.4.11's 3:1 satisfied if
either tone clears it:

| | result |
|---|---|
| themes where the ring pair clears 3:1 on a **highlighted** row | **20 of 23** |
| themes where it does not | **3** |

The three:

| theme | core:row | halo:row | best |
|---|---|---|---|
| nord | 2.87 | 2.32 | **2.87** |
| tokyo-night | 2.91 | 2.21 | **2.91** |
| gruvbox-dark | 2.75 | 2.23 | **2.75** |

On the other eight dark themes the core alone drops under 3:1 once the row lightens (default-dark
2.51, midnight-rose 2.35) and **the halo carries it** at 8 to 12:1. That is the pair working as
you designed it. On those three the tint lands between the two tones and dims both at once.

So a keyboard user is not on a 1.2:1 signal: on 20 of 23 themes they have the same audited ring
they get everywhere else in the product. On three they have 2.75–2.91, which is close but under.

---

## What I think this adds up to

**D: accepted, and it works.** Measured by deriving an ink against the 20% ground and testing it
on both, exactly as you specified:

| | result |
|---|---|
| pairs clearing 4.5:1 at 20% | **137 of 138** |
| pairs clearing 4.5:1 at 14% | **138 of 138** |
| roles needing **no** separate ink (ΔE\*ab = 0 from the flat ink) | **86 of 138** |
| the one exception | **nord / warning, 4.12 at 20%** |

Your "one ink covers both strengths" holds, and your observation that some roles need no ink at
all generalises: nearly two thirds do not. Nord's warning is the single case the ramp cannot
satisfy at 20%; it clears at 14%, so it is the hover state alone on one role of one theme. I would
rather bring that to you as a named exception than quietly widen the tolerance.

**A: dropped**, on your reasoning and now with worse numbers than I gave you.

**B: agreed it ranks third,** and you are right that it was incomplete as I wrote it — I priced
only the hover ground and left the five resting-state failures unaddressed.

**The menu: the tint is the cause, so §4's route is closed, and §5's rail is a smaller job than
you costed it.** Since the ring already carries focus on 20 of 23 themes, the rail is not needed
as *the* indicator. What is left is a choice on three dark themes, and I would want your eye on
which of these you prefer:

1. **The rail on all themes**, as you designed it — consistent, and it fixes the three.
2. **Fix the three by the ring**, since the halo is what fails there: the halo is derived to clear
   3:1 against the *surface*, and nobody derived it against a lightened row. Re-deriving it against
   the highlighted ground would fix those three the same way D fixes the wash — the ground moved,
   so the ink should move. It is your own §2 argument applied to the ring.
3. **Both**, with the rail as the positional signal you argue for in §5 and the halo fix for
   compliance.

Option 2 is the one that follows your principle most closely, and it touches three themes rather
than all 23. But your point about a highlighted row being hard to *locate* while arrowing quickly
is about findability, not contrast, and no amount of re-deriving fixes that — so if you want the
rail for that reason it is a separate and legitimate argument, and I would build it.

## What I have not done

Nothing is implemented. No colour, token, tint or component has changed since my last note. I have
not built D, the rail, or the halo re-derivation; I wanted the §4 correction in front of you first,
since it invalidates the route you spent most of your reply on.

## On method

Everything above is measured against the shipped engine on the 23 locked palettes, not modelled.
The one number I take from your reply rather than my own measurement is the ΔE\*ab convention, and
I have recomputed my own figures in it rather than converting yours. Your caution about modelling
my engine was well placed: the §4 premise failed for exactly that reason, and the fault was in the
column I handed you, not in what you did with it.
