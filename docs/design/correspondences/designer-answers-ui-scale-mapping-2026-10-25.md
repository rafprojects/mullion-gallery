# UI scale mapping — the open rows, and the one question underneath the number question

**2026-10-25.** Reply to `UI_SCALE_MAPPING.md` (P81-A).

The two-pass structure is right, and the pass-1 discipline — zero pixels moved, proved by diff — is
the correct bar for a mechanical codemod. The unlayered-stylesheet finding that killed utility
classes is a good catch and the right conclusion. Nothing below reopens any of that.

The open rows are answered in §2. But the last section of your document, the px-versus-rem
discrepancy, is not really a question about numbers, and I want to take it first, because its
answer decides how the number rows should be written.

---

## 1. Numbers must share the tokens' basis — and the tokens' basis must not belong to the host

You wrote:

> On a WordPress theme that sets `html { font-size: 62.5% }`, a migrated `gap={4}` grows from
> 2.5px to 4px **while every token-based gap shrinks with the root.**

The second half of that sentence is the defect. The first half is a symptom of it.

**A gallery plugin's UI has to render at the size its design specifies, on every host.** If a
WordPress theme sets the root to 62.5% and every `rem` token in the framework shrinks to 62.5% of its
design size, then the product ships 37.5% smaller on that site — menus, inputs, the focus ring's
6px reach, the 12px badge glyph, all of it. That is not a scale-mapping question; it is the
framework's size basis being owned by someone else's stylesheet. `rem` resolves against `<html>`
no matter how deep the shadow root is, so the shadow boundary does not protect it.

Mantine's own answer to this is `--mantine-scale`: tokens are `rem × scale`, and an app on a
62.5% root sets the scale to compensate. The framework has inherited the `rem` half of that and —
from your description — not the compensation. **So the first thing to settle is the invariant:**

> **One token step is the same physical size on every host.** The framework measures the
> document's root font size at mount and sets its scale so that `1 step` renders at design size.
> Numbers in spacing and size props are read in the same basis as tokens — rem, times the same
> scale — so a number and a token are always in the same units and shrink or grow together.

With that in place, the number question answers itself: **read numbers the way Mantine does
(rem), because that is the way the tokens are read,** and pass 1 already emits that. The `scale.ts`
comment — "the same reading Mantine gives" — is wrong about pixels but right about intent; fix the
reading, keep the intent.

What it would be wrong to do is read numbers as px *because* px is "safer against the host." That
makes numbers the only thing in the UI that does not shrink with the root, which is precisely the
inconsistency your 62.5% example shows. A `gap={4}` that holds at 4px beside a `gap="sm"` that
drops to 7.5px is not safer; it is a layout that has lost its proportions.

**Verify before relying on it:** mount the gallery on a theme with `html { font-size: 62.5% }` and
measure one token gap. If it comes back at 62.5% of nominal, the basis is unprotected today and
that is the P81 item ahead of the number mapping, not behind it.

### And then there is the design-debt question: 136 numbers out of 409 gaps

A third of the gaps in the product are off the scale. That is the thing a migration is *for*.
Before the codemod reaches `Stack` and `Group`, I would like the histogram of those 136 values.
My expectation is that nearly all of them are 2, 4, 6, 8, 12 and 16 — and that most would land on a
token if the scale had a step below `xs`. Mantine's `xs` is 10px; a design system with nothing
between 0 and 10 pushes every tight gap into a literal. **If the histogram confirms it, add `2xs`
(4px) and `3xs` (2px) to the spacing scale and fold the numbers onto tokens in pass 2.** Leave a
literal only where the value is deliberately off-scale, and emit it in the same basis as the tokens.

That is a design decision I can make without seeing the sites, and it turns a mechanical rename into
a measurable improvement: the number of off-scale gaps in the product goes from 136 to a small
reviewable list.

---

## 2. The open rows

### `teal` → `primary`, not `success`, unless the site reports an outcome

Five sites. The brand accent is cyan-teal, and `color="teal"` in Mantine is the nearest palette
entry to it — so the likely history is someone reaching for "the brand colour" before the brand
colour existed as a token. That is `tone="primary"`. Map it to `success` only where the element is
reporting that something *succeeded*. Five sites is few enough to read each one; the default is
`primary`.

### `blue` → by what the component *is*, not where it sits

The rule is semantic and it is one line: **on a control it is the brand action; on a status
component it is information.**

| component class | `blue` becomes |
|---|---|
| `Button`, `ActionIcon`, `Anchor`, `Tabs`, anything a user operates | `tone="primary"` |
| `Alert`, `Badge`, `Notification`/toast, anything that reports a state | `tone="info"` |

On both default themes `primary` and `info` resolve to the same value, so this is invisible on
the defaults and only matters on homage themes where the two diverge. It still matters: a user on
Nord should see Nord's info colour on an info alert, not Nord's accent.

### `gray` / `dark` → no tone on controls, `muted` on text

| | |
|---|---|
| `ActionIcon color="gray"` (14 sites) and any other control | **no tone.** This is the neutral control — the quiet icon button — and the framework's un-toned control should be exactly that. If an un-toned `ActionIcon` does not read as the quiet neutral, that is a component defect to fix once, not fourteen `tone` props to add. |
| `Text c="gray"` | `tone="muted"` — the same as `dimmed`. |
| `c="dark"` on text | no tone; it inherits `text`, which is what `dark` was approximating. |

### `Badge variant="dot"` → `variant="outline"`, and the glyph replaces the dot

The four dot badges are status indicators: a coloured dot beside a label. **That is a colour-only
signal, and this engagement already settled that a role-coloured dot does not survive colour-vision
deficiency** — success and warning dots on a light ground measured ΔE00 2.7 under protanopia at
full chroma. Since P80-A a toned `Badge` carries its role glyph by default, and the glyph is a
silhouette. **So `variant="dot"` maps to `variant="outline"` with its tone; the default glyph does
the dot's job, and does it for every user.** No new variant. The migration removes four colour-only
signals as a side effect, which is the right direction for it to be moving.

### Field `variant="filled"` → drop it; `variant="unstyled"` → needs a split

**`filled`:** the framework field already sits on `surface2`, which *is* the filled input — it was
specified for exactly that. Dropping the prop should produce the same reading. If it does not, the
default field is wrong, not the mapping.

**`unstyled`:** this is the one I cannot answer from the prop name, because it is used for two
different things. Mantine's `unstyled` input is reached for either (a) an inline-editable value — a
title you click to rename, a number in a table cell — or (b) a search field embedded in a bar that
already supplies its own chrome. Those want different things: (a) wants a `bare` field that keeps
its focus ring and its typography and drops only its box; (b) usually wants the normal field, and
the bar's chrome was compensating for Mantine's. **Send me the 28 split by `filled` / `unstyled`,
and the `unstyled` ones with a one-word note of what each is.** If (a) exists in any number, the
framework field gets a `bare` prop — one addition, specified once. If it is all (b), they take the
default.

### `Container size="sm"` → let it take 768

One site, 48px wider. Decision B says pass 2 is a refresh reviewed per surface, and this is a
surface. Let it take the framework's step and look at it in review; reach for `size={720}` only if
the layout was tuned to that width and the extra 48px breaks something. Pinning a legacy default
into a literal to avoid a review is the wrong trade on a one-site change.

### Two rows that are not marked open but should be

**`Text size="10px"` and `"9px"` passing through as lengths.** 9px is below any size at which Inter
is reliably legible as interface text, and a migration should not carry it across untouched. **In
pass 2, any `size` under the smallest text token becomes the smallest text token, and the site is
listed for review.** If something genuinely needs to be 9px it is not text — it is a decoration, and
it should say so. I would want to see what those sites are before agreeing any of them stay.

**The 265 colour-prop sites going by hand.** Right call, and it is the migration's main quality
gate — so it deserves a rule rather than 265 judgements. **A `c`, `bg` or `color` that names a Mantine
palette shade maps to a *role*, never to a hex or a shade.** `bg="red.9"` is a danger fill;
`c="orange.4"` is a warning text; `c="white"` on a fill is the fill's on-colour. Where no role fits,
that is not a hex to preserve — it is a gap in the role set, and the right output of the hand pass is
a short list of those gaps for me, not a short list of hexes that survived. The token system exists
to make `red.9` impossible to write; the migration is where it stops being possible.

---

## 3. Where it stands

| | |
|---|---|
| **Size basis** | Settle the invariant first: one step is the same size on every host; numbers share the tokens' basis. Verify on a 62.5% root. |
| **Numbers in pass 2** | Read as rem × scale, as Mantine does. Send the histogram of the 136; expect to add `2xs`/`3xs` and fold most onto tokens. |
| `teal` | `primary` by default; `success` only where it reports an outcome. |
| `blue` | Controls → `primary`. Status components → `info`. |
| `gray` / `dark` | Controls → no tone. Text → `muted`. |
| `Badge dot` | `outline` + tone. The glyph replaces the dot, and that is an improvement. |
| Field `filled` | Drop the prop. |
| Field `unstyled` | Send the 28 split and annotated. Likely a `bare` prop for the inline-edit cases. |
| `Container sm` | Take 768; review. |
| 9px / 10px text | Floor at the smallest text token; list for review. |
| Colour props by hand | Role, never hex. Gaps come to me as a list. |

Nothing here blocks pass 1. Pass 2 on `Stack` and `Group` waits on the histogram and the
size-basis check; everything else in pass 2 can be written from the rows above.
