# Headings at 600, and the lightbox scrim has a number

**2026-10-26.** Reply to `text-and-title-2026-10-26.md`.

---

## 1. Heading weight — 600

**Interface headings are Inter 600.** Keeping 700 to move nothing was the right call for the flip;
now change it, as one line, in the refresh.

The rule behind it, which I would like in the spec so the question does not come back:

> **The interface uses three weights: 400 body, 500 labels and rest states, 600 emphasis — headings,
> the active tab, anything that has to sit above a label. 700 appears in one place in the product:
> the wordmark, in Archivo.**

Three reasons for 600 over 700:

**Inter 600 is the heading weight for interface type.** At 14–20px, Inter 700 fills in and reads as
bold body rather than as a heading; 600 is confident without going dense. Every interface that sets
its UI in Inter and has thought about it lands here.

**Hierarchy is not weight alone.** A heading sits above a label by size and by ink — `text` against
`textMuted` — as well as by weight. One weight step plus a size step plus an ink step is plenty; two
weight steps on top of those is a heading shouting.

**It keeps 700 meaning something.** If the wordmark is the only 700 in the product, the wordmark
is the heaviest thing on any screen it appears on, which is what a wordmark should be. And it
collapses the system to three weights, with the active tab and the headings sharing one — which is
tidier than three emphasis levels nobody designed.

---

## 2. The muted ink on the checked option — right fix, right rule

Dark muted ink on the primary fill was exactly P79-C's case — both the ground and the ink carrying
colour — and the on-fill ink is the correct resolution. It reads better than the grey it replaced,
and it goes away with `Select`. Nothing to add except that this is the second time looking at a
capture caught what the numbers could not, because the numbers were never run against that ground.
Rule 1 again, and the migration keeps finding its instances.

---

## 3. The lightbox caption — your fix holds, and here is the floor it needs

**White on a gradient of the theme's background** was a fixed ink on an unaudited ground, and on
light themes it was white on near-white. Theme text on that gradient is the right direction. But a
gradient is only as opaque as it is at the caption line, and that opacity is the thing to pin:

| theme | caption ground at the caption line | worst photo | text on it |
|---|---|---|---|
| default-dark | `background` at 0.50 over white | `#848a8d` | 3.24 — fails |
| default-dark | **`background` at 0.60 over white** | `#6b7276` | **4.53** |
| default-light | `background` at 0.50 over black | `#747778` | 3.69 — fails |
| default-light | **`background` at 0.60 over black** | `#8c8f91` | **5.12** |

**Same number as the thumbnail: the gradient must reach 0.60 opacity at the caption line,** and the
fade should complete before the first glyph, as you built it for the thumbnail. At 0.50 both
defaults fail against the photo they are weakest on; at 0.60 both clear. That gives one rule for
every caption-on-image in the product rather than two:

> **A caption over an image sits on a scrim that reaches 0.60 opacity at the caption line.** The
> scrim is black with white text where the surface is not themed (the media picker), and the theme's
> `background` with the theme's `text` where it is (the lightbox).

**One thing to add to CI, because the table above is the two defaults only.** The caption's ground
is `background` at 0.60 over the worst photo — white on a dark theme, black on a light one — and
`text` must clear 4.5:1 against it. That is a row per theme, and it belongs in the audit for the
same reason `menu-bg` did: it is a ground the text is painted on. I would expect all 23 to clear
with room, since it is a weakened version of the text-on-background pair every theme already
passes at 7:1 or better, but *expect* is the word I keep being wrong about.

**On looking at the lightbox as a whole: yes, after `Select` and the dialogs flip.** The lightbox is
the one surface a site's *visitors* see, so it is worth a proper pass — but it is built from the
components still in flight, and I would rather look at it once on the framework than twice. Put it
on the list for when its parts have moved.

---

## 4. The review list — all fine

The five floors, the summary line to `info` and the drag-over hint to `primary` are each the rule
applied correctly, and the hint is a nice example of the control/status distinction doing work on a
single element. The `Text`-inside-`Text` inheritance — size and line height flow, weight resets,
transform inherits — is exactly the kind of thing that only gets written down when something has to
reproduce it; good that it now has a test. Carrying Mantine's line-height rungs as constants rather
than a flat 1.55 is also right, and quietly fixes something I had not noticed.

---

## 5. Where it stands

| | |
|---|---|
| **Headings** | 600. Three-weight rule into the spec; 700 is the wordmark only. |
| Checked option ink | Right. Goes with `Select`. |
| **Lightbox scrim** | Theme text on theme background, **reaching 0.60 at the caption line.** One CI row per theme. |
| Lightbox as a whole | After `Select` and the dialogs. |
| Review list | Nothing to change. |

Nothing open on my side. Next family when ready.
