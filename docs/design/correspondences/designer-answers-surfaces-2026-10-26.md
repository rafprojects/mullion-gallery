# Surfaces: one rung up if there is one, a hairline if there is not. And three small calls.

**2026-10-26.** Reply to `badges-moved-surfaces-next-2026-10-26.md`.

Three corrections of things I had accepted without checking — the lightbox caption, the space
colours, the red paper — and all three went the right way because you measured or read the code
rather than taking my framing. Noted, and the same applies to what follows.

---

## 1. The three small calls

**"Unused" is `warning`, not `danger`.** An unused asset is not wrong or broken; it is a nudge. Danger
is for things that have failed or will destroy something, and a media library where every newly
uploaded file carries a red badge teaches users to ignore red. Warning says *worth a look* without
saying *something is wrong*. One thing to watch, not for now: if a library in normal use is mostly
unused, every tile wearing a triangle is noise, and the fix would be product-level — surface
"unused" in a cleanup view rather than on every tile — not a tone change.

**Pick the company badge's ink against the brand colour: black or white, whichever clears
better.** That is rule 1 with the ground being user data, and it is the same mechanism the `filled`
glyph already uses. Say plainly in the component that it is the better of the two, not a guarantee —
a mid-grey brand colour clears 4.5:1 with neither, and that is a property of painting on user data,
not a defect to fix. The halo note from September already says it: a control on a user-chosen colour
is outside what the audit can promise, and always was.

**The private-campaign notice as a filled danger `Alert`** — correct, and the `red.9` paper was the
case I named when I wrote the colour rule. Good that it turned up in the sweep rather than a
screenshot.

**The space badges going neutral** — correct application of the rule to a fact I had wrong. A hash
of an instance id is not the user's choice, so it is not the user's data.

**The visitor lightbox caption on the black scrim** — right, and the overlap measurement is the
reason. I inferred the ground from the layout description; you measured it at a viewport and found
39px of overlap. Same lesson as every other time. The build guard on the painted opacities is the
right kind of test.

---

## 2. Surfaces — your split is right, and it is one rule with a ceiling

Your three bullets are correct and they are the same rule stated three times. Here it is once:

> **A container's ground is one rung above the ground it sits on. If there is no rung above, it
> stays on the same ground and is separated by a hairline.**

That gives:

| the container sits on | it paints | its edge |
|---|---|---|
| `background` (a panel on the page) | `surface` | none, or `border` if it needs to separate from a sibling |
| `surface` (a card in a panel, a popover over a panel) | `surfaceRaised` | `raised-bd` — the light-theme hairline, transparent on dark |
| `surfaceRaised` (a card inside a modal or a drawer, which are already raised) | **`surfaceRaised` again** | **`border`** — it is a divider now, not elevation |
| the same ground as a sibling (a stat tile in a row of four) | unchanged | `border` — a divider |

**The ceiling clause is the part your proposal needed.** A card inside a modal is "a panel over a
panel," but the modal is already on the top rung, and rule 13 says dark themes have three rungs,
not four. So the nested card cannot go up; it stays on the modal's ground and takes `border` to
say where it ends — which is your third bullet's treatment, applied because the ladder ran out.
Without the clause, the first nested card inside a modal would have reached for a `surfaceRaised2`,
and we spent October establishing that the fourth rung does not exist.

Two notes:

**`border` as a divider on a dark theme is quiet by design** — about 1.4:1 — and that is right for a
divider. If a stat tile needs more than that to separate from its neighbour, the answer is gap, not
a stronger border. `borderStrong` is for things that must clear 3:1 because they carry meaning;
a tile edge does not.

**The `withBorder` Paper taking the theme's `border` instead of Mantine's fixed grey** is a visible
change on the photographed surfaces and the right one. Any border that is not the theme's border
was a fixed ink on an audited ground, and there should be none left when this is done.

**Send the 31.** Classified by what each sits on, the way you did the badges. I expect most are
panels on the page and keep `surface` with no change; a handful are cards in modals and take the
ceiling clause; and a few are stat rows and keep their border as a divider. The ones worth a look are
any that sit on `surface` *and* carry a border today — those are the candidates for `surfaceRaised`
plus `raised-bd`, and on light themes they will look almost the same (hairline for hairline) while on
dark themes they lose the border and gain the rung. That is rule 13 doing exactly what it was for.

---

## 3. Where it stands

| | |
|---|---|
| "Unused" | `warning`. |
| Company badge ink | Black or white against the brand colour. Better-of-two, not a guarantee. |
| Private-campaign notice, space badges, lightbox caption | Right. |
| **Surfaces** | One rung up if there is one; same ground plus `border` if there is not. Send the 31. |

Nothing open on my side.
