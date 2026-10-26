# The tab ring is neither of your two defects. It is the third one, and your inset variant is clear to build.

**2026-09-14.** Reply to `designer-response-tone-signal-and-ring-scope-2026-09-14.md`.

**Short version:** I read the code rather than the screenshot. The tab ring is not `:focus`
stickiness and it is not a deliberate selection mark — it is a **correct `:focus-visible` ring on
the focused tab**, clipped on three sides by `overflow-x: auto` on the tab list. Your pixels were
right about everything except the cause, and the cause makes it a purer instance of your §1 class
than you thought. The inset measurement is done: **33 of 391 pairs fall under 3:1, and every single
one is a solid role fill.** Nothing neutral, nothing washed. Build the inset variant; keep the
outset one for filled controls.

---

## 1. Which defect the tab bar is

Neither of the two you named. Taking them in turn, from the source:

**Not `:focus` stickiness.** Our ring block does carry `.mantine-focus-always:focus`, so your
hypothesis had a real selector behind it. But that class is only applied when the theme sets
`focusRing: 'always'`, and **nothing in this app sets `focusRing` at all**, so it defaults to
`'auto'` and every focusable component gets `.mantine-focus-auto`, which is `:focus-visible`. That
`mantine-focus-always` line has therefore never matched anything in this product. It is dead code,
and I am leaving it for now only because deleting it is a separate change with its own risk of
being wrong about some component I have not checked.

**Not a selection mark.** The active-tab rule is
`.mullion-mantine-tabs-tab[data-active] { color: var(--mullion-tabs-tab-active-color) }` and that is
its entire body. Selection sets a colour. Nothing anywhere gives a selected tab an outline.

**What it is:** a keyboard focus ring on the tab that had keyboard focus. R was running your audit
with NVDA and a keyboard when the screenshot was taken, so the focused tab and the selected tab were
the same tab, and the ring read as a selection mark because of the coincidence.

**The decisive test, if you want it confirmed in the browser rather than in the source:** click a
tab with the mouse. If the ring appears, I am wrong and it is `:focus`. If it does not, it is doing
its job and only the geometry is broken.

**This makes your §1 conclusion stronger, not weaker.** A misapplied ring would have been a
discipline failure. A correctly applied ring that is unreadable because its container clips it is
the architectural problem you identified, with no human error in the middle of it.

`Tabs.List` carries `style={{ overflowX: 'auto', flexWrap: 'nowrap' }}`. Once either axis is not
`visible`, the other computes to `auto` as well, so the bar clips vertically too — which is your
missing top band, exactly.

**Your spec line is right and I would put it in verbatim:**

> The focus ring marks keyboard focus. It is not a selection mark, an active mark, or an emphasis
> mark. Anything that needs to look chosen gets its own treatment.

## 2. The inset variant: measured, and safe with one exclusion

`pairOn()` against every ground the inset variant would land on, all 23 themes, better tone of the
pair, 3:1 floor:

| ground | pairs below 3:1 |
|---|---|
| `surface`, `surfaceRaised`, `menu-bg`, `input-bg`, `table-hover-bg` | **0** |
| all six `tone-wash` grounds at 14% | **0** |
| the six solid role fills | **33 of 138** |
| **total** | **33 of 391** |

Every failure is a **solid role fill** — a `filled` Button, a `filled` Badge. Worst cases are
`default-dark` on info and accent at 2.10, and `high-contrast` on info and accent at 2.14.

That is a clean split and it maps onto the geometry rule anyway: a filled control is a control with
clearance, which is where the **outset** ring already works and is not clipped. So:

- **inset** for an element flush with its container on a neutral or washed ground — menu rows, tab
  rows, table cells, list items;
- **outset** unchanged for anything that floats, filled controls included.

Nothing needs a new colour. If you would rather have one geometry everywhere, the fills are the
obstacle and that is a different conversation.

I have added the neutral and wash grounds to the audit already; the fills I have deliberately left
out, because adding them would fail 33 pairs today for a variant that is not going to be used there.
When the inset variant lands I will gate it on the grounds it is actually allowed on.

## 3. §4: option 1, and yes please draw the glyphs

Accepted, including `Badge` getting an icon slot. Your argument that it is the component that needs
it most rather than the one to exempt is the right way round, and the ΔE00 7.0 between the success
and accent washes under *normal* vision is the part I would not have found.

**Please cut the four.** 12 / 16 / 20px with the silhouette test. The differing-silhouette
constraint is the requirement and I will hold the implementation to it — a check, a triangle, an
octagon or cross, a circle-i is exactly the spread I would want.

I will build the default-with-opt-out shape: `tone` set on a `light` control supplies the role glyph
unless one is given or `icon={false}` declines it.

## 4. What I am building next, in order

1. **The rail**, as specified — the only row treatment, tint retired.
2. **The inset ring variant**, gated to non-fill grounds, with the audit extended to cover it.
3. **The glyph default** on `Alert`, `Button` and `Badge`, once you send the four.

The tab bar itself I would take after those, with **C** as you recommend, since it is the only
option whose selection signal is not purely colour and that is now a settled requirement rather
than a preference.

---

**One correction to my own last note.** I told R that `?portal=document` would test whether the
shadow boundary was breaking the Select's ARIA. It does not: `document` mode sets the portal target
to null, so Mantine falls back to `document.body`, which is still outside the gallery's shadow root.
Both modes portal out of tree. The only mode that keeps a dropdown in the same tree as its trigger
is `?portal=shadow`, and that test has not been run yet. Nothing in this note depends on it, but the
Select keyboard defect is still open and I do not want it recorded as diagnosed.
