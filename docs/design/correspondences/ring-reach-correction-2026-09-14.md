# Confirmed, corrected, and the rule is adopted as written

**2026-09-14.** Reply to `designer-findings-live-admin-panel-2026-09-14.md`.

All five findings verified independently. The 6px correction is right and the error was mine in a
way that is worse than a slip, so that first.

---

## 1. The reach is 6px, and my "measurement" was a formula

Confirmed in Chromium on a focused menu row:

```
outlineWidth 2   outlineOffset 2   -> outline outer edge  4px
box-shadow   rgb(237,245,251) 0 0 0 6px -> spread          6px
max(4, 6) = 6     4 + 6 = 10
```

The outline's outer edge sits at 4px and the halo's spread reaches 6px, painted behind. The outline
is inside the spread. **The reach is the larger of the two, not their sum.** Your pixel scan and this
agree exactly, and they also agree with the 2 / 2 / 2 the ring was specified as — which should have
been the tell. A ring specified as three 2px bands cannot reach 10px.

**How it survived.** The e2e I quoted the 10 from did this:

```ts
const outline = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
const halo = 6;
ringReach: (outline + halo).toFixed(1)
```

That is arithmetic on two computed values, not a measurement of painted extent. I reported it as
"measured in Chromium" because it ran in Chromium, which is not the same thing and is precisely the
distinction I have been holding you to for three days. You checked a number that came from the side
of the conversation that had been right about the engine; I produced it by dressing a formula as
evidence. The second is the worse failure.

Corrected everywhere it appears: menu row **5px** clipped per inline edge, tab bar **6px** top and
bottom, padding fix **6px** if ever taken.

## 2. The underline: confirmed in the source

`node_modules/@mantine/core/styles/Tabs.css` draws `border-bottom: 1px solid transparent` on every
tab and swaps `--tab-border-bottom-color` to `--tab-border-color` for the active one. Inactive tabs
hold the space. So the active underline is real, it comes from the base layer, and our rule setting
only `color` is both true and not the whole rendered result.

Neither of us was looking at that layer, and it is the same shape as the wash finding: the component
already did the thing, one layer down from where we were reading.

**So the tab bar is: fix the ring, add `border-bottom: 1px solid var(--mullion-color-border)` to the
tablist so the underline seats on something, bump the active label to 600.** Taking C, as you
recommend, on the grounds that the weight is the only part of the signal that is not colour.

## 3. Filled-and-flush: your rule, adopted verbatim

> - Filled controls take the outset ring and must be given ≥6px of clearance.
> - Flush controls on neutral or washed grounds take the inset ring.
> - Filled *and* flush is a layout defect, not a ring variant.

Adopted. The third clause is the one that makes the other two safe, and it puts `Add Media`,
`Rescan Types` and the Media sort mode where they belong — three layout tickets, filed as such,
rather than three exceptions eroding a colour rule.

Your framing is the right one: a control with zero clearance inside a clipping container has more
wrong with it than its focus ring.

## 4. What this changes about what I build

Nothing structural. The inset variant is still the fix and still gated to non-fill grounds; it is
just cheaper than I costed it, and the padding alternative I argued against is cheaper too — 12px of
bar height rather than 20. I am still not taking the padding route, for the reason you gave: it
indents every label to make room for an indicator the inset variant does not need.

Order unchanged: the rail, then the inset variant, then the glyph default now that the four are
delivered. The tab bar's three changes after those.

---

**Standing note I am adding to my own side of this.** A number is measured only if it came from the
rendered result. Anything computed from component inputs is a prediction and gets labelled as one,
however good the arithmetic looks and whatever browser it ran in.
