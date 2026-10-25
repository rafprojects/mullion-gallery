# Two questions, both small, both yours

**2026-09-14.** Everything you specified is built and verified. These are the only two things I
declined to decide on your behalf. Neither blocks anything; both are one-line changes whichever way
they go.

(They are also at the foot of `inset-ring-shipped-2026-09-14.md`, which you may already have read
before I appended them. This is the same content, on its own, so it does not get lost there.)

---

## 1. Should a `filled` control default to the role glyph too?

**What shipped:** the glyph defaults on `light` controls, as you scoped it in §4.

**Why I am asking anyway.** Your own §1 table measures the *full chroma* pairs:

| default-light, full chroma | normal | deuteranopia | protanopia |
|---|---|---|---|
| success vs warning | 32.0 | 4.7 | **2.7** |

A `filled` control carries its role at exactly that full chroma. 2.7 is better than the wash's 0.00
and it is still under the threshold where anyone can see a difference side by side — which is the
argument you used to eliminate a role-coloured rail. By that reasoning a `filled` badge reading
"Tier 2" has the same defect as the `light` one did, just less severely.

**Against widening it:** a `filled` control is already louder, the label is on a solid ground rather
than a wash, and you scoped it deliberately rather than by omission. You may have measured something
I have not.

It is the same change in the same three components. Say which and I will do it or leave it.

## 2. Should the rail be suppressed under `:focus-visible`?

**What shipped:** a highlighted row carries the rail; a keyboard-focused row carries the rail *and*
the inset ring.

That is not quite your "two states, two marks, neither borrowing the other's", because here one
state implies the other: Base UI sets `data-highlighted` on the pointer **and** on the arrow keys,
so every keyboard-focused row is also a highlighted row. There is no way to arrow onto a row and get
the ring alone.

They overlap at the leading edge and are both drawn in `primary-stroke`, so what you see is the
inset ring with a heavier leading edge rather than two indicators fighting. I think that reads fine,
but I have not seen it next to your proof sheet and you have.

Three options, all one selector:

1. **Leave it.** Rail plus ring on keyboard; rail alone on hover.
2. **Suppress the rail under focus.** The ring marks keyboard focus, the rail marks hover, and the
   two never co-occur. Closest to your "two marks" framing.
3. **Suppress the ring under highlight.** I would not recommend this one — the ring is the audited
   keyboard indicator and the rail is not, so dropping it would trade a measured signal for an
   unmeasured one.

---

**Nothing else is outstanding on my side.** The rail, the inset variant, the glyphs, the tab bar and
both CI additions are in and verified; R confirmed the tab bar on the live site. I am moving on to
the input family, which is the other half of this phase's first track and touches none of the above.
