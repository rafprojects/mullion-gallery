# Dialogs stay on `surface` — the backdrop is their elevation. And one correction to my own table.

**2026-10-26.** Reply to `surfaces-classified-2026-10-26.md`.

Good premise check. The ceiling clause did assume dialogs were raised, and they are not, and the
answer to "should they be" changes ten rows — so it had to be settled first.

---

## 1. Dialogs and drawers stay on `surface`

**A modal does not need the rung to read as floating; its backdrop does that.** The dimmed page
behind a dialog is the strongest elevation signal in the product — stronger than any rung — and it
is there on every theme regardless of ground. That is the difference between a dialog and a menu: a
menu has no backdrop, so it needs `surfaceRaised` to separate from what it floats over; a dialog
already sits on a darkened page and reads as the topmost thing on screen before its own ground is
even painted.

So the discriminator is the backdrop, and it gives a one-line rule that matches the spec's existing
"`surfaceRaised`: menus, popovers":

> **A floating surface with a backdrop — a dialog, a drawer — paints `surface`. A floating surface
> without one — a menu, a popover, a bar over a list — paints `surfaceRaised`.**

It also keeps the nesting room where nesting happens. Dialogs are where the product's editors and
pickers live, and they are full of panels; putting dialogs on the top rung would turn every one of
those panels into a bordered tile. Keeping them on `surface` gives each dialog a rung to spend, and
the ceiling only bites one level further in, as in `MediaLibraryPicker.tsx:65`, which is exactly
where it should.

**Your table's "by the rule" column applies. The "if dialogs are raised" column does not.**

---

## 2. One correction to my table: raised containers take `raised-bd` at every rung

Your row for the admin panel's own card — *"no border, it has no sibling"* — is a correct reading of
what I wrote, and what I wrote was incomplete. My table gave the first rung "none, or `border` if it
separates from a sibling." That conflates two different edges.

**`raised-bd` is the hairline rule 13 gives a raised element on a light theme, and it belongs on
every container that went up a rung — the first rung included.** `border` is only ever a divider
between things on the same ground. So:

| the container | ground | edge |
|---|---|---|
| raised one rung — on the page *or* in a panel | the rung above | **`raised-bd`** — hairline on light, nothing on dark — plus its shadow |
| at the ceiling, or beside a sibling on the same ground | unchanged | `border`, as a divider |

**The admin panel keeps its edge on light themes by rule, not by exception.** On `default-light`
`surface` over `background` is ΔE00 2.80 — above the threshold, but quiet for the largest surface in
the view — and rule 13's light half exists for exactly that: the hairline and the shadow carry what
the lightness cannot. On dark themes it loses the border and the rung does the work, which is the
other half of the same rule. That is not a special case for the admin panel; it is what every
first-rung panel on the page should get, and the campaign card is the only one that differs,
because its edge is the site owner's setting.

**The bulk-actions bar** is a floating surface without a backdrop — it hovers over the list — so it
is a `surfaceRaised` by the rule in §1, with `raised-bd` and its shadow. Your row has it right.

---

## 3. The rest

**The Access badge keeping its explicit eye icon** — right. An explicit icon wins, and an eye beside
the word is a non-colour signal twice over.

**The company badge's yellow going from white at 2.20 to black at 9.53** is the rule doing its
job on real user data, and the `inkOn` comment saying *better of two, not a guarantee* is the honest
version.

---

## 4. Where it stands

| | |
|---|---|
| **Dialogs and drawers** | `surface`. The backdrop is the elevation. Menus, popovers and backdropless bars are `surfaceRaised`. |
| **Edges** | Raised containers take `raised-bd` at every rung, first included. `border` is a divider only. |
| Admin panel card | `surface`, `raised-bd`, shadow. Keeps its edge on light themes by rule. |
| The 31 | Your "by the rule" column, with `raised-bd` added to the first-rung rows. Move the batch. |

Nothing open on my side.
