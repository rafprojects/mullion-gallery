# Correction: D is not needed. The wash was never broken, and the defect is mine.

**2026-09-13.** Second reply, and it retracts most of the brief you answered.

**Short version: stop before building D.** I told you the `light` variant paints semantic text on
a tinted ground. **It does not.** P79-C settled that months before this batch, deliberately, with
the rule written into the stylesheet, and my 41 wash failures were measured against a pairing the
framework never renders. The only place a semantic colour is painted as text on a tinted ground is
a rule I wrote last night in the Menu. The defect is P80-A's and it is one selector wide.

I am sorry for the wasted round. Your §2 reasoning is sound and I would have accepted it; it just
turns out to be answering a question that was already answered, by the same argument, in June.

---

## 1. What the `light` variant actually does

From `control.css`, unchanged since P79-C:

> One rule governs colour in this framework: **tint the ground or colour the ink, never both.** A
> `light` control tints its ground, so its label is the theme's text colour and the tone is carried
> by the tint. Colouring both is what fell to 2.92:1 on the light themes, because a role's text rung
> is selected against the theme's plain surfaces and a tint of that role is not one of them.

That is your §2 argument, reached independently and shipped. `Button`, `Badge`, `Alert` and `Chip`
in their `light` variant all paint `--mullion-color-text` on the wash, never the role colour.

I checked every rule in the framework that paints `--mullion-tone`, and there are eleven. Ten of
them paint it on a plain audited surface, or paint it as a border or an icon. The eleventh is mine.

**The two that do sit on a wash are both icons**, and the same comment calls that out: an icon is
non-text and answers to 1.4.11's 3:1, not 1.4.3's 4.5:1. Measured at the correct floor:

| ground | pairs below **3:1** | worst |
|---|---|---|
| `tone-wash` 14% | **0 of 138** | 4.24 |
| `tone-wash-strong` 20% | **0 of 138** | 3.82 |

So there is nothing to fix on the wash. **D solves a problem that does not exist**, and B's holding
position is not needed either. Both are withdrawn, not deferred.

## 2. What is actually broken, and it is one line

`.mullion-menu-item[data-mullion-tone] { color: var(--mullion-tone) }`, written by me yesterday,
on a row whose ground lightens by 8% when highlighted. That is exactly the both-at-once the house
rule forbids, and I did not know the rule was there.

Combined with the §1 correction from my last note — the menu's ground *is* audited, and the
selector stops at the nearest passing rung, so the tightest theme sits 0.03 above the floor — a
highlighted toned row fails AA on 22 of 23 themes. That is the whole of the 99 failures I reported:
58 of them real and confined to this one rule, 41 of them measured against a pairing that does not
render.

**I fixed it by applying the existing rule rather than inventing anything:** the highlight tint now
excludes rows that carry a tone. An un-toned row still tints, because plain text on the tinted
ground measures 4.73 at worst. A toned row keeps its audited ink on the untinted ground at 4.53 or
better, and is marked by the focus ring.

**Re-inking the menu instead was measured and rejected**, and the numbers are worth having because
they are the counter-argument to applying §2 here:

| | result |
|---|---|
| colours that move | **57 of 138** |
| median / max shift | **ΔE\*ab 11.0 / 24.8** |
| pairs still failing afterwards | **3** |

The ramp cannot reach 4.5:1 against the lightened ground for those three, so re-inking costs a
Nord-scale repaint *and* does not finish the job. Your instinct to move the ink where the ground
moved is right in general; on this particular ground there is no ink to move to.

## 3. Where that leaves your §5

Your §5 is the part of your reply that survives intact, and it is now the only open question.

From my last note: the ring does paint on menu rows, and the pair clears 3:1 on a highlighted row
on 20 of 23 themes, failing on nord (2.87), tokyo-night (2.91) and gruvbox-dark (2.75). With the
fix above, a **toned** row no longer lightens at all, so on that row the ring sits on `menu-bg`,
where it clears 3:1 on **23 of 23** (worst 3.01). The three failures now apply only to un-toned
highlighted rows.

So the state of it:

- **Keyboard focus is covered.** The audited ring paints, and on the rows that still tint it clears
  3:1 on 20 of 23 themes.
- **Your findability argument is untouched and I think it stands.** At 1.2:1 a tinted row is hard
  to locate while arrowing quickly, and that is a usability point no contrast fix addresses. The
  rail answers it; nothing else here does.
- **A toned row now has no pointer-hover affordance at all.** It does not tint and the ring is
  keyboard-only. That is a real gap the fix introduces, and the rail would close it.

**So the rail is still worth building, for your reason rather than mine.** I have not built it: it
is a visual decision and it is yours. If you want it, I would add it to every row, with the tint
kept underneath on un-toned rows as you suggested.

## 4. What I got wrong, so you can calibrate the rest

Two errors in two rounds, both the same shape: I measured the engine correctly and then described
the wrong thing.

- The `flat` column was `surface` alone, not the four-ground list, which sent your §4 after an
  unaudited ground that was audited.
- The wash failures were computed at 4.5:1 against a text pairing the CSS does not render, because
  I went from the tokens to the arithmetic without reading which rule painted what.

Your closing note last round said that every time you modelled my engine rather than measured it
you were wrong. The inverse held here: I measured the engine and did not read the components. The
stylesheet already carried the answer in a comment.

**Nothing is pending from you except §5.** No token, colour or tint has changed apart from the one
selector above.
