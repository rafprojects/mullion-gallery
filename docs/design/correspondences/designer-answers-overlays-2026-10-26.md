# Black scrim everywhere. The hairline by rule 13. 18px titles, Mantine's accordions, the framework's tabs, 12px tooltips without arrows.

**2026-10-26.** Reply to `overlays-before-they-move-2026-10-26.md`.

**On the locked-chrome regression.** Good catch, and it shows something about the test that missed
it. Swapping one theme's palette for another's, across a drawer's buttons, switches and fields, came
in under a 10% screenshot tolerance. A tolerance that absorbs that is not testing colour. The new
test checks that the drawer's controls resolve the brand's `surface` exactly, which is the right
kind. Rely on it rather than on the screenshot for colour.

Matching Mantine's sizes and spacing without asking is fine. On animation: honour the two settings
users can choose, and also the operating system's `prefers-reduced-motion`. When either asks for less
motion, an overlay appears without sliding or scaling. A short fade is acceptable.

---

## 1. One scrim: black at 0.60, for modals and drawers alike

Rule 13 says a dialog paints `surface` because *the dimmed page behind it is its elevation*. On
a light theme, the adapter's scrim makes that sentence false. I measured the default-light dialog
(`surface`, `#f7fafb`) against the page as each scrim leaves it:

| page under the scrim | `background` at 0.75 | black at 0.60 |
|---|---|---|
| white | ΔE00 **1.77** | 42.2 |
| `surface` | 2.24 | 43.1 |
| `background` | 2.80 | 45.3 |

Over white content the dialog and the paled page are below the 2.0 threshold, so the
dialog does not separate from the page at all. Only its hairline does. A pale scrim also reads as
"this page is fading," not "this page is behind you." The cost of black is that a light theme goes
dark for as long as a dialog is open. That cost is acceptable: while a dialog is open, the page is
not what the user is looking at.

On dark themes the dialog against the dimmed page measured ΔE00 9.4 to 24 across a range of
content under it, so black works on both.

**Make it one token, `--mullion-backdrop`, black at 0.60.** It is the same opacity as the fixed
caption scrim, which means one number for "black over the page" across the product. The visitor
lightbox's 0.93 stays separate. Its job is to make the photo the only thing on screen, not to lift
a surface.

---

## 2. The edge, the header rule and the shadow

**The edge is `raised-bd`, as everything else is: the hairline on light, nothing on dark.** I am not
adding a dialog exception. On dark, the ΔE00 9+ above shows that ground lightness and the scrim
already do it, and a `border` all round would be the divider token used as an outline, which rule 13
rules out. The drawers get the same treatment as the modals. The adapter's 1px `border` round every
modal goes.

**The divider under the header appears only when the body has scrolled under it.** At rest, the
header and body are one surface, and a rule between them divides nothing. Once content scrolls
beneath the header, there is a real edge, where content disappears, and that is a divider's job.
The drawer's tab bar already has its own rule, so the drawer's header needs nothing more.

**The framework's medium shadow, not Mantine's large one.** Over a black 0.60 scrim the difference
between the two cannot be seen. Using the shadow raised elements already use means one less value.

---

## 3. The title: 18px at 600, at the heading line height

A dialog's title names the whole dialog, and its body is 14px with 14px/500 field labels. At 16px a
title is only one step above those labels, and at 18px it is clearly above them. Mantine's line
height of 1 also clips descenders as soon as a long title wraps. Keep the framework's title, and
let the header height you are matching to Mantine grow if a title wraps rather than clip it.

---

## 4. Accordions: Mantine's size, and the label at 16px/500

**Do not move the settings panel to the denser accordion.** The decisive reason is hierarchy, not
density. An accordion label in the settings panel is a section heading, and the fields inside it
have 14px/500 labels. At 14px/500 the section "Theme & Layout" would be set exactly like the
"Theme" label inside it. So:

- **16px label, 500.** It is one step above the field labels in size, and 500 so a heading does not
  look lighter than the labels under it.
- **Mantine's padding, height and 16px between sections.** The settings panel is read, not
  scanned at density. The builder's two accordions take whatever size step their panel uses, if
  the accordion has sizes. If it does not, Mantine's numbers are fine there too.
- **Keep a hover, as a neutral.** The header is a whole-row click target, and hover is how a pointer
  finds that out. The hover ground is a neutral rung (`surface2`), never the primary wash, because
  the wash means checked. Open and closed are told apart by the chevron, which is the non-colour
  signal.

---

## 5. Tabs: the framework's weights, Mantine's spacing, the framework's hover

**400 at rest and 600 when selected, with each tab reserving its 600 width.** That is already what
the admin tabs got in September: the underline plus 600. It is also what the segmented control just
got. One tab bar should not hold every tab at the same weight while another uses weight as the
signal.

**Mantine's 16px padding with no gap between tabs.** With a 10px gap, a pointer between two tabs is
over nothing. Tabs whose targets touch have no dead strip, and the bar looks the same.

**The framework's ink-only hover.** In this tab bar the selected tab is marked by an underline and
weight, and it has no fill. A filled hover would make an unselected tab look heavier than the
selected one. Hover strengthens the ink and nothing else.

**Keyboard focus is the inset ring (rule 8).** The tab list scrolls horizontally, and that is
exactly where an outset ring was clipped in September.

---

## 6. Tooltips: 12px, 8px corners, wrapping at 288px, no arrows

- **12px (`xs`) at 1.4.** 13px is not on the scale, and nothing else in the product would be 13px.
- **8px corners.** That is the product's radius for controls and floating surfaces, and fields just
  took it. A tooltip is the smallest floating surface, not a different family.
- **The framework's wrapping.** A short tooltip stays on one line anyway. A long one that refuses to
  wrap runs off-screen at the edges of the builder.
- **No arrows, on tooltips or on menus and popovers.** Centring the tooltip on its anchor already
  ties the two together, and a menu opens from the button you just pressed. An arrow is one more
  shape to keep matched to every ground. The few call sites that asked for one get the default
  placement.

---

## Where it stands

| | |
|---|---|
| Scrim | One: `--mullion-backdrop`, black 0.60, modals and drawers. Lightbox 0.93 separate. |
| Dialog edge | `raised-bd` by rule 13, drawers too. No `border` outline. |
| Header divider | Only when the body has scrolled under the header. |
| Shadow | The framework's medium. |
| Title | 18px, 600, heading line height. Grows, never clips. |
| Accordions | Mantine's metrics. Label 16px/500. Neutral hover. |
| Tabs | 400/600 with reserved width. 16px padding, no gap. Ink-only hover. Inset focus ring. |
| Tooltips | 12px/1.4, 8px corners, wrap at 288px, no arrows anywhere. |
| Motion | The two user settings and `prefers-reduced-motion`. |
| Menus | As settled on 14 September. |

When dialogs move, send one light-theme modal over a page with a photo in it, before and after. The
scrim is the change users will notice first. Nothing else is open on my side.
