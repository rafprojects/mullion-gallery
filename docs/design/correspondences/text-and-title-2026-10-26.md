# Text and Title are on the framework: one question, and two things you will see

**2026-10-26.** Follows `designer-answers-pass-two-2026-10-26.md`.

Your review round is built: `grow` columns stay equal (a test now nests a wide child beside a short one and asserts one line, equal widths), the cover badge and the section heading took `2xs` after I looked at them on the dev site, and the `Card.Section` inheritance is written down where the reset lives. The wp-admin pages render cleanly under their new provider, and wp-admin's root is 16px, so the size basis there is exactly 1.

The next family has moved: `Text` and `Title`, 642 edits in 95 files.

---

## 1. One question: heading weight

Every `Title` in the product renders at **700**. That is Mantine's default; nothing in our theme set it, and the brief lists 700 among the weights in use without assigning it to headings. The framework's `Title` was built at **600**.

I kept 700 so the flip moved nothing, and it is one line either way. **Which do you want for interface headings, 600 or 700?** At 600 a heading sits one step above a 500 label rather than two; at 700 it matches the wordmark's weight, though in a different face.

## 2. What you will see: muted ink

Every `c="dimmed"` is now `tone="muted"`, your contrast-selected rung, where it was Mantine's `dimmed` grey. On the photographed surfaces it is the only change, and it is slightly darker on the light themes: "Access mode", the empty-state line, secondary text throughout.

One place it went wrong, caught by looking at the capture rather than the numbers. The open theme selector fills the checked option with the primary colour, and that option's description became dark muted ink on teal, close to unreadable. Your rule says why: tint the ground or colour the ink, never both. A muted rung is measured against plain surfaces, never against that fill. The checked option's description now takes the option's on-fill ink, white on teal in both themes, which reads better than the grey it had before the flip. The fix lives in the transitional Mantine select styles and goes when `Select` moves, because the framework's select marks the checked option with a check rather than a fill.

## 3. Two contrast defects, fixed under your rules

**The media thumbnail caption.** As you specified: `xs`, white, one line, on a scrim that reaches `rgba(0,0,0,0.60)` at the caption line. The scrim now starts 6px above the text so the fade completes before the first glyph.

**The lightbox caption, which nobody had flagged.** The media lightbox puts the image's caption in white over a gradient of the *theme's background colour*. On a dark theme that is white on dark; on every light theme it was white on near-white. It now takes the theme's text colour, which is legible on that ground in every theme. It is the same pattern as the thumbnail caption, a fixed ink on a ground nobody audited, so I mention it in case you want a look at the lightbox as a whole.

## 4. For your review list

Five sub-token sizes floored to `xs` per your rule (the three field affixes with `muted`, the asset name, and the thumbnail caption above). One `c="blue"` on text became `tone="info"`: the summary line at the top of the shared gallery-config editor, which describes the current selection rather than offering an action. And a drop-zone hint that turns blue while files are dragged over it became `primary`, because it is something the user is operating.

A Mantine `Text` inside another kept three things from its parent (size, line height, letter case) and reset one (weight). The framework now does exactly the same, and a test holds it. I mention it because it is the kind of rule nobody writes down until a migration has to reproduce it.
