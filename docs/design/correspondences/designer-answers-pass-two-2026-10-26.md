# `grow` stays equal — and the review options are the adjacent rungs, not the old literal

**2026-10-26.** Reply to `pass-two-begins-2026-10-25.md`.

Zero pixels on every photographed surface, the three rungs in the theme, 130 gaps folded, and a
leak caught by the first flip rather than the fifth. Good first flip. One decision below, one
correction to the review framing, and a note on two of the six sites.

---

## 1. `Group grow` — columns stay equal, whatever their content

**Mantine's behaviour. Equal shares, capped, content squeezed.** One line in the sheet, as you
said.

The 37 rows are nearly all *pairs of the same kind of thing* — X and Y, width and height, line
height and letter spacing — in property panels. Three reasons equal is the right reading there:

**A property panel is a grid, and the rows have to agree on where the columns are.** If "X | Y"
splits at the middle and "Line height | Letter spacing" splits at 45/55 because the second label is
longer, the right-hand column's left edge wanders row to row, and the panel stops reading as a
panel. Equal shares keep an implicit grid without anyone drawing one.

**A field's width should not depend on its label's text.** Labels change — localisation is the
obvious case — and a layout that reflows when a translation is four characters longer is a layout
that nobody designed.

**A label wider than its column is the label's problem, not the column's.** It wraps or truncates
inside the field, which is overflow a field already has to handle. Letting it widen the column
solves the label's problem by making it everyone else's.

**The one case equal gets wrong, and what to do instead:** a panel so narrow that an equal share
is below a field's minimum usable width. The answer there is not unequal columns — it is one column.
A `grow` row whose equal share would fall under the field's minimum should stack. That is a
responsive rule for the panels rather than a `grow` rule, and it is for P81-B's panel work, not this
flip. For now, equal and capped.

---

## 2. The six sites — and the review's options are rungs, not the literal

> *If any of the 8-to-10 changes reads as too loose, say which, and it goes back to a literal as a
> deliberate off-scale value.*

**No — if 10 is too loose, the answer is `2xs`, not 8.** The point of this pass is that spacing in
the product is on the scale; a review that can end in the old literal is a review that can undo the
pass one site at a time. The options for an 8 that reads loose at 10 are the rung below (6) or the
rung it is on. A literal survives only where *neither* adjacent rung is right, and that should be
rare enough to be a conversation each time.

With that framing, the six:

| site | call |
|---|---|
| the gradient-direction buttons, both files | `3xs` is right. Adjacent icon buttons that read as one control. Done. |
| the "no mask layer" empty state | one child, renders nothing. Done. |
| the focal-point preview row | thumbnail beside its controls — `xs` is right; it is a thumbnail and a control group, not an icon and its label. Done. |
| **the company badge: logo then name** | **this is an icon-and-label pair, and that is the `2xs` or `3xs` semantic, not `xs`.** It was already loose at 8. Inside a badge, logo to name is the same relationship as icon to label in a button. Look at it; I expect `2xs`. |
| **the section heading: icon then label** | **same relationship, same call** — with one allowance: a heading's icon is larger than a button's, and a larger icon can carry a slightly larger gap. If `2xs` reads cramped beside a 20px icon, `xs` stands. Either is a rung. |

So four are done and two want a look, and neither of the two has a literal as an outcome.

---

## 3. The inheritance leak — right diagnosis, right generalisation

A `Group` with no `justify` reading its parent's `space-between` is exactly the P79-0 tone
inheritance in geometry, as you say, and the button-inside-a-`Paper` taking the paper's radius is
the one I would have hit next. Resetting what each component reads, and a nesting test as the
pattern for every family before it flips, is the right shape of fix. Nothing from me on it except
that the deliberate exception you name — `Card.Section` reading its card's padding — is the kind of
thing that should be written down as deliberate where the reset lives, so the next person does not
"fix" it.

---

## 4. Where it stands

| | |
|---|---|
| **`grow`** | Equal shares, capped. Mantine's. One line in the sheet. Stack-when-too-narrow is a P81-B panel rule. |
| **Review framing** | Options are adjacent rungs. A literal needs a conversation. |
| **Six sites** | Four done. Company badge → look, expect `2xs`. Section heading → `2xs` or `xs`, either is fine. |
| **Inheritance reset** | Right. Write down the deliberate exceptions where the reset lives. |
| wp-admin pages | Waiting on your browser check; nothing from me until then. |

Nothing open on my side. Next family when you are ready.
