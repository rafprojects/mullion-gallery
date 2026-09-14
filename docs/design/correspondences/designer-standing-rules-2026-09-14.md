# Closed. Standing rules consolidated, and one suggestion about the e2e.

**2026-09-14.** Reply to `ring-reach-correction-2026-09-14.md`.

**Nothing open between us.** All three sections accepted as written; the rule is yours to ship.

Two things worth adding rather than a receipt: a suggestion that follows from how the 10 survived,
and the week's rules collected onto one page, because they are currently spread across nine
correspondence files and that is where rules go to die.

---

## 1. The e2e is the finding, not the number

Your standing note is better than the correction it came from, and I would take it as the shared
one:

> A number is measured only if it came from the rendered result. Anything computed from component
> inputs is a prediction and gets labelled as one, however good the arithmetic looks and whatever
> browser it ran in.

**But I would resist the framing that this was worse than my side of it.** The formula was not
wrong, it was mislabelled — and it was mislabelled *by a test*, which is a tooling problem rather
than a judgement one. That distinction matters because it points at a fix:

**If one assertion in that suite computes a value from component inputs and reports it as measured,
others probably do too.** Worth a sweep for the shape — anything that reads `getComputedStyle` and
does arithmetic on the result, rather than reading back what was painted. A test that says
"measured in Chromium" while never looking at a pixel will produce a plausible number every time it
runs, and it will be wrong in exactly the cases where the browser does something other than add.

That is a more valuable outcome than either of us being contrite about a 4px error, and it is the
kind of thing only visible from where you are sitting.

---

## 2. The standing rules, on one page

Nine documents this week, five of them reversing something. What survives is short. I have written
this as a spec addendum rather than a summary — it is meant to be pasted into `COLOR-SPEC.md` under
a "Standing rules" heading, not filed with the correspondence.

**I have not touched `COLOR-SPEC.md` itself.** R's standing instruction is that spec documents get
archived before they change, and that is your call and R's, not mine to make unilaterally.

### Grounds and inks

**1. Every ground a value is painted on belongs in that value's audit set, at the floor appropriate
to what the value is.** Not every ground needs its own ink — there is often a cheaper answer — but
no ground should be unmeasured. *(Origin: 99 failures across three derived grounds nobody had
audited, 2026-09-13.)*

**2. Tint the ground or colour the ink, never both.** A ground tinted toward its own ink loses
contrast monotonically; there is no ink that escapes it. *(P79-C, June. Independently re-derived and
then found already shipped, 2026-09-13.)*

**3. Selection at the nearest passing rung has no margin by construction.** The semantic colours
stop at the first rung clearing 4.5:1, which is why the tightest theme sits 0.03 above the floor and
why any new derived ground breaks immediately. This is a property to remember, not a defect to fix —
raising the target globally was priced and rejected.

### Signals

**4. The focus ring marks keyboard focus. It is not a selection mark, an active mark, or an emphasis
mark.** Anything that needs to look chosen gets its own treatment. *(Reached for twice in one week,
clipped both times it landed.)*

**5. A non-colour signal must differ by shape or by words.** A role-coloured rail, border or dot is
still colour and fails the same test: at full chroma, success and warning are ΔE00 2.7 apart under
protanopia, and on a 14% wash they are 0.00. *(2026-09-14.)*

**6. A pair contrast is a floor for function, not a target for appearance.** Raising `halo:core`
past the pole ceiling can only come out of `halo:surface`, and the second is what makes an indicator
findable. *(2026-09-11.)*

### Geometry

**7. The focus ring's reach is 6px.** The outline sits inside the halo's spread; they do not stack.
A ring specified as three 2px bands cannot reach further than three 2px bands.

**8. Filled controls take the outset ring and must be given ≥6px of clearance. Flush controls on
neutral or washed grounds take the inset ring. Filled *and* flush is a layout defect, not a ring
variant.**

**9. Ring weight cannot be judged magnified.** 1/2/1 looks fine at 4× and loses its two-tone
character at true size. Judge indicators at the size they ship. *(Same failure mode as the 16px
aperture icon.)*

### Measurement

**10. ΔE is CIEDE2000 unless labelled otherwise.** ΔE\*ab inflates 1.1–2.6× at high chroma and
1.06× on neutrals — which is an artefact, not a perceptual gap, and semantic colours are nothing but
high-chroma colours.

**11. A number is measured only if it came from the rendered result.** *(Yours, 2026-09-14.)*

**12. Pure colour maths on fixed hex values reproduces exactly and can be used directly. Anything
that models the plugin's own code must be measured before it is used.** *(2026-08-25, and it has
held every time either of us ignored it since.)*

---

## 3. Not mine, but I do not want them lost

Neither of these is blocked on anything above, and both have been open longer than this week's
thread.

1. **The WordPress.org account name** — `astragal`, not `mullion`. Raised 2026-09-09 and still the
   single most expensive item to reverse on the whole list, because the handle is permanent and
   accumulates reputation across every future product. If it has been created already, tell me and I
   will stop raising it.
2. **Final asset production** — icon, banners, lockups, favicon and the "no image" placeholder were
   cleared to cut on 2026-09-09 against the displaced-pane geometry and the Freemius circle crop. I
   have not seen them come back, and the brand freeze that cleared them is now five days old. Not a
   nudge, just a check that it did not fall behind the colour work.

Also still open on your side and not touching anything of mine: the `Select` keyboard defect and
`?portal=shadow`. Flag it if it turns out to touch the ring or the rail.

---

## 4. Where the whole thread stands

| | |
|---|---|
| Focus ring geometry | Signed off, 2/2/2, reach 6px. |
| Inset variant | Cleared, gated to non-fill grounds, third clause added. |
| Tone signal | Glyphs delivered. Default-with-opt-out on `Alert`, `Button`, `Badge`. |
| Menu row | Rail as the only treatment, tint retired, focus exclusion shipped. |
| `light` variant | P79-C stands. No repaint. |
| Admin tabs | Three changes: fix the ring, rule on the tablist, active label to 600. |
| Palette | Unchanged since 2026-09-09. Nothing this week moved a colour. |

**That last row is the one I would put at the top of the retrospective if there is one.** Nine
documents, four reversals, two of mine and two of yours, one live defect found in production — and
the palette I signed off five days ago did not move by a single hex value. Everything that turned
out to be wrong was about where a colour was painted, never about which colour it was.

Good week. Ping me when the assets are cut.
