# Both checks answered. The rail is clear to build, and the clip finding argues for it.

**2026-09-14.** Reply to `designer-response-menu-and-light-variant-2026-09-14.md`.

**Short version:** `Select` is a separate primitive, so the rail does not collide with a selected
state. The ring **does** clip inside the menu, badly — 9px of a 10px reach, on both inline edges —
and that is a second defect the rail retires. Your §3 focus exclusion is shipped. Your two CI asks
are shipped, one of them smaller than you thought. Your §2 question has an answer and it is the
one you did not want.

---

## 1. Your two checks before building

**Is `Menu` also the base for `Select`? No.** Base UI ships `menu`, `select` and `combobox` as
separate primitives with separate parts, and P80-B wraps the select family on its own. Our `Menu`
has no selected state and will not acquire one. **The rail is free to mark hover and focus.**

**Does the ring clip inside the menu's padding? Yes, and worse than your estimate.** Measured in
Chromium on a highlighted row:

| | |
|---|---|
| ring reach beyond the row | **10px** (2px outline + 2px offset + 6px halo) |
| room the row actually has | **1px** (the menu's border; inline padding is `0px / 0px`) |
| clipped | **9px on each inline edge** |
| menu `overflow` | `auto` |

You estimated a menu with under ~8px of inner padding would cut it. It has none, and
`overflow: auto` clips rather than spills. So on every theme, today, the halo on a focused menu row
is cut on both sides — which also means the 3:1 figures we have been trading are for a ring that is
not fully drawn.

**This is a point for the rail rather than against it.** A rail is inset and flush; it needs no room
outside the row and cannot be clipped by the container that holds it. Fixing the clip for the ring
instead would mean giving the menu 10px of inline padding and taking it off the rows, which indents
every label to buy space for an indicator the rail does not need.

I have not fixed the clip. If you take the rail as the row treatment it stops mattering for the
row; the ring still needs to not be clipped wherever else it lands inside a scrolling container,
and I would rather solve that once, properly, than paper over this instance.

## 2. §3 is shipped

A row no longer tints under `:focus-visible`, whatever its tone. The ring now always sits on
`menu-bg`, and nord, tokyo-night and gruvbox-dark are closed with no new colour, exactly as you
said. One selector, guarded by a test that a mutation fails.

You were right that my fix was one line short, and right about which line.

## 3. Your CI asks, both shipped — and one was already done

**The wash grounds at 3:1: added**, one check per role per strength, twelve new checks per theme,
all 23 passing. Mutating the wash strength upward fails them on 20 themes naming the role and the
ratio, so they are load-bearing rather than decorative.

**`menu-bg` in the ring's grounds: already there, twice.** `pairOn('surfaceRaised')` has audited the
ring pair against that ground since P77-F, and `menu-bg` derives from `surfaceRaised`, so the pair
was covered. I added `pairOn('menu-bg')` anyway, for one narrow reason: `menu-bg` is a component
token a theme may override, and the moment a theme overrides it the derivation check stops covering
what is painted. So it earns its place, but it is a guard against a future theme rather than the gap
you thought it was.

Your rule is the right one and I have taken it as the standing rule:

> Every ground a value is painted on belongs in that value's audit set, at the floor appropriate to
> what the value is.

## 4. Your §2: yes, and you will not like it

**Can a toned `light` variant render with no icon and no role word? Yes.** `Badge` takes a `tone`
and children and has no icon slot at all. `Button` takes a `tone` and a `leftSection` that is
optional. Nothing in the type system or the components requires a non-colour role signal, and a
`Badge tone="success"` reading "Tier 2" is a legal, unremarkable call.

So your measurement stands as a live defect rather than a hypothetical: on `default-light` under
protanopia that badge is the same colour as a warning one, at ΔE00 0.00.

**Your proposed fix does not reach `Badge`,** which is the component most likely to carry a bare
role word, because it has no icon slot to make mandatory. Making one mandatory is a bigger change
than "you already paint it": it is a new required part on a component that currently renders a
label and nothing else.

I am not going to design my way out of that in a reply. What I would want from you is which of
these you mean, because they are different products:

1. **A required icon on every toned `light` control**, `Badge` included, which means giving `Badge`
   an icon slot and a default glyph per role.
2. **A non-colour signal that is not an icon** — a leading rail as on the menu, a border weight, a
   shape difference — which composes better with a badge's size.
3. **A lint-level rule rather than a visual one**: a toned `light` control must receive either an
   icon or text that names the role, enforced where components are used rather than in the
   component.

My instinct is 2 for `Badge` and 1 for `Alert` and `Button`, but that is taste on a question you
have the standing on, and I would rather ask than pick.

## 5. What I have and have not built

Built: the focus exclusion, the twelve wash-icon checks, the `menu-bg` pair check.

Not built: **the rail.** You have specified it and both your pre-conditions now answer in its
favour, so it is the next thing I do unless §4 changes its shape — if `Badge` ends up carrying a
rail as its non-colour signal, I would rather design the two together than ship a menu rail and then
a badge rail that disagree with each other. Tell me which way §4 goes and I will build both.

Also not built: the clip fix, for the reason in §1.

---

**One correction to my last note.** I said the ring pair clears 3:1 on 23 of 23 themes on `menu-bg`.
That figure is arithmetic on the token values and it assumes the ring is drawn. Given §1, on a menu
row it currently is not, fully. The arithmetic is still the right target; it is just not yet a
description of what a user sees.
