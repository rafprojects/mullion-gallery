# Option 1, with a correction to option 2. And the ring has escaped into a third job.

**2026-09-14.** Reply to `menu-rail-answers-2026-09-14.md`.

**Rail: confirmed, build it.** Both pre-conditions answer in its favour and your clip measurement
settles it.

**§4: option 1**, and I need to take option 2 off the table properly, because it fails the test that
motivated the question and it would have been an easy thing to ship without noticing.

**And a third thing, which is new and which you have not seen because it is not in the framework:**
the focus ring is being used as the *selection* mark on the Admin Panel tab bar, in production, and
it is clipped there too. Section 3.

---

## 1. §4 — option 2 does not work, and here is why

Your instinct was 2 for `Badge`, 1 for `Alert` and `Button`. I would have guessed the same. It is
wrong, and the reason is worth stating precisely because it is the trap this whole question is
about.

**A leading rail, a border weight or any other role-coloured mark is still colour.** It fails the
same test the wash fails. The relevant number is not how *strong* the colour is but whether two
roles remain separable once dichromatic vision has collapsed them:

| default-light, full chroma | normal | deuteranopia | protanopia |
|---|---|---|---|
| success vs warning | 32.0 | 4.7 | **2.7** |
| warning vs error | 29.1 | 4.4 | 7.1 |
| success vs error | 64.4 | 8.5 | 8.8 |

At **full** chroma — the strongest the role colour ever gets — success and warning sit at ΔE00 2.7
under protanopia. That is barely above the threshold at which anyone can see a difference at all,
on colours a hundred times more saturated than the wash. **A role-coloured rail would be a signal
that measures 2.7 instead of 0.00, and neither is a signal.**

The only channels that survive are **shape** and **words**. That eliminates option 2 in every form
that keeps the mark role-coloured, and it collapses the question to option 1.

### Option 1, in the form I would build it

**When `tone` is set on a `light` control, the component supplies a role glyph by default.** Not a
new decision at each call site; a default that has to be actively declined.

- Four glyphs, one per role, **chosen so the silhouettes differ** — a check, a triangle, an
  octagon or cross, a circle-i. That constraint is the whole point: four variations on a disc would
  measure fine and signal nothing. Distinguishable at 12px, in the role colour, at the 3:1 floor you
  already measured on the wash.
- `icon={false}` as an explicit opt-out, for the developer who knows their label already names the
  role. The default is the signal; the opt-out is a deliberate act.

**`Badge` gets an icon slot, and I know that is a new required part.** I am asking for it anyway, on
two grounds:

**It is the component that needs it most, not the one to exempt.** "No icon slot" is why a bare
`Badge tone="success"` reading "Tier 2" is a legal call. The absence is the defect.

**It is also under-designed for normal vision, which I had not noticed until I measured it for this
reply.** On `default-light` the success wash and the accent wash are **ΔE00 7.0** apart at 14%, and
success against warning is 7.8. That is not a confident distinction on a 20px chip in a dense table,
for anyone. CVD made it measurable; it was always thin. A glyph fixes the badge for every user, not
just for the ones the audit catches.

**Option 3 as a supplement, not a substitute.** A lint rule is worth having, but it cannot tell
whether "Tier 2" names a role and "Continue" does not. It can only enforce *presence*, and presence
is what the default glyph already gives you. Use it to flag `icon={false}` in review, not to carry
the requirement.

**For `Button`**, the same rule lands softly: set `tone`, get the glyph in `leftSection` unless one
is supplied or declined. Most toned buttons already name their action, so most will decline it — but
they will decline it on purpose.

---

## 2. The rail and the clip

**Build the rail.** `Select` being a separate primitive removes the collision, and your clip
measurement is the stronger argument: **9px of a 10px reach, on both inline edges, with
`overflow: auto`.** I estimated "under about 8px of padding would cut it" and the true figure is
0px of inline padding. An indicator that needs room outside an element is the wrong indicator for an
element that is flush with its container.

**Your correction at the foot of the note is the right one and I want to endorse it explicitly.**
The 3:1 figures we have traded for four days describe a ring that is not fully drawn. That is worth
more than the numbers were: it means the menu row has, in production, been marking keyboard focus
with a three-sided indicator, and nobody looking at a contrast table would have found it.

**Do not fix the clip by giving the menu 10px of inline padding.** Indenting every label in the
product to make room for an indicator is the tail wagging the dog, and you are right that it should
be solved once rather than here. Section 3 is my proposal for solving it once.

---

## 3. New: the ring is marking *selection* on the Admin Panel tabs, and it is clipped there too

R sent me a screenshot of the admin tab bar. I sampled it rather than eyeballing it.

**The bands are byte-exact the default-dark focus ring:**

```
horizontal scan, left edge of the selected tab
  x=421  #edf5fb   ← halo,  2px
  x=424  #008e85   ← core,  2px
  x=427  #edf5fb   ← halo,  2px
  x=430  #102530   ← surface
```

`#edf5fb` / `#008e85` in a 2 / 2 / 2 band. That is the ring, wrapped around the **selected** tab,
persistently, with no keyboard interaction involved.

**Two other things the pixels say.**

**It is drawn on three sides.** There is no top band at any scanline — nothing at y = 96 to 101
across the whole bar — while the bottom core band spans the full tab width at y = 171. The left and
right bands run the full height. So what a user sees is a bracket, not a ring, and a large part of
why it reads as wrong is that **it is broken, not merely misapplied.** This is your §1 clipping
class, second instance, in a shipped screen.

**The box is 172 × 72 px around a 13 px word.** A tab is text with no box of its own, so the ring
invents one, and the invented box has no relationship to anything else in the bar.

### Which defect it is, I cannot tell from a screenshot

Either the rule is `:focus` rather than `:focus-visible`, so it sticks after a mouse click — or the
ring is deliberately applied to the selected tab. **The fix is the same either way:** the ring marks
keyboard focus and nothing else, on `:focus-visible` only, and selection gets its own mark. But you
should find out which, because one is a one-character change and the other is a design decision
someone made on purpose and will make again.

### The general fix: the ring needs an inset variant

The pattern behind both instances: **the ring is an outset indicator that needs 10px outside the
element.** That works where an element floats with clearance — a chip, a button, a form field. It
fails wherever the element is flush with its container, which is now two places we know of and
probably more: menu rows, tab rows, table cells, list items, anything inside `overflow: auto`.

So: **a second geometry, same pair, drawn inward.**

```css
/* outset — today's ring, unchanged, for elements with clearance */
outline: 2px solid var(--ring-core);
outline-offset: 2px;
box-shadow: 0 0 0 6px var(--ring-halo);

/* inset — same 2/2/2 reading, for flush elements */
box-shadow:
  inset 0 0 0 2px var(--ring-core),
  inset 0 0 0 4px var(--ring-halo),
  inset 0 0 0 6px var(--ring-core);
```

It cannot be clipped, it cannot collide with a neighbour, and it needs no padding from the
container. It reads as the same indicator because it is the same two tones in the same widths.

**One thing to measure before adopting it, and it is our own rule biting me:** the inset ring's
outer tone sits against the *element's own ground*, not against the surface behind it. That is a
different ground, and by the standing rule it belongs in the audit set before the variant ships. On
a tab the element is transparent so the ground is the bar's surface and nothing changes; on a
tinted or filled control it is not. Please run `pairOn()` against the element grounds the inset
variant would actually land on, and tell me if any theme falls under 3:1.

### And the tab bar itself

Attached: `admin-tabs-options-2026-09-14.png` — the current bar and three replacements, rendered in
the colours sampled from the screenshot.

**A — underline only.** Selected tab at full-strength `text` with a 2px accent underline seated on
the bar's own bottom rule; unselected muted, nothing else. This is what the design is already
half-way to and it is the one I would ship.

**B — soft pill.** Selected tab on `surfaceRaised`, no accent. Quieter, reads as a segmented control
rather than a page tab, and it survives the bar wrapping to two rows, which A does not.

**C — underline plus weight.** A, with the selected label at 600. **The only one of the three whose
selection signal is not purely colour**, which after §1 is not a small point: on a nine-tab bar the
underline can easily fall outside where the eye lands, and weight carries it. If R wants one
recommendation rather than three, it is C.

The last two rows of the sheet show selection and keyboard focus on the same bar at the same time —
`Templates` selected, `Assets` focused — with focus drawn by the inset ring. Two states, two marks,
neither borrowing the other's.

---

## 4. Where it stands

| | |
|---|---|
| **The rail** | **Build it.** Both checks clear; the clip settles it. |
| **§4 tone signal** | **Option 1**, as a default glyph with an explicit opt-out. Option 2 fails CVD; option 3 supplements. |
| **`Badge` icon slot** | Yes, and it fixes normal vision too — the washes are only ΔE00 7.0 apart at 14%. |
| **Glyph set** | Four roles, **silhouettes must differ**. That constraint is the requirement, not a detail. |
| **Inset ring variant** | Proposed above. Measure the element grounds before adopting. |
| **Admin tabs** | The ring is marking selection and is drawn on three sides. Find out which defect it is. Replace with C (or A). |
| **Menu clip** | Do not pad the menu. The inset variant is the once-and-properly fix you asked for. |

**Nothing is pending from me.** The glyph set is the one thing I should draw rather than describe —
say the word and I will cut the four at 12 / 16 / 20px and send them with the silhouette test.

---

One observation, since this is the third time this week. The focus ring is the most visible object
in the system, so it keeps getting reached for whenever something needs to look active: the menu
row's focus state, and now a tab's selected state. Both times it arrived somewhere it was never
measured, and both times it was clipped when it got there. That is not a discipline failure — it is
what happens to the loudest component in a design system. Worth one line in the spec:

> **The focus ring marks keyboard focus. It is not a selection mark, an active mark, or an emphasis
> mark.** Anything that needs to look chosen gets its own treatment.

---

**Attached:** `admin-tabs-options-2026-09-14.png`.
