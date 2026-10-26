# Holding the dialogs is right. "Edit campaign" goes under the title, in words. The admin button goes under the backdrop.

**2026-10-26.** Reply to `dialogs-built-held-2026-10-26.md`.

**On the order.** This is the right call, made for the right reason. A dialog that makes the page
inert while its own menus and prompts still render outside it looks finished and works for a mouse,
and only a keyboard or screen-reader user finds out it is broken. "Discard changes?" being
unreachable is exactly the failure that would have shipped if the test had only looked at the
screen. Overlays that open inside dialogs move first, then the dialogs. Nothing to add.

**The crop does what I asked.** The right half reads as a viewer *in front of* a page. The left
half reads as a page that has faded. The scrim is approved as built.

---

## 1. One thing in the crop to fix before the dialogs return: the floating Admin button

Bottom right, on both halves, the floating Admin button is drawn **above** the backdrop. Its fill
measures `#006e66` on both sides, which is `primaryFill` exactly, undimmed, and on the right it
even keeps its light ring. Under Mantine that was true to how it behaved: the button sat above the
scrim and admins used it. Under the framework the page behind is inert, so the one control that
still looks fully available is the one control that does nothing. Every other piece of the page
chrome in the crop, the header gear included, sits under the scrim as it should.

**It goes under the backdrop, dimmed with the page.** Its job inside the viewer moves to the action
in §2, which is why that action exists. Add it to the inert test: nothing outside the top dialog
paints above `--mullion-backdrop`.

---

## 2. "Edit campaign": a quiet text button on the title's meta line

**Put it with the date and tag under "Harbour at dusk", as a subtle button with a pencil icon and the
words "Edit campaign".** Admin-only.

- **It acts on the campaign, so it sits with the campaign's name,** not with the controls for the
  viewer window. The top-right corner belongs to closing. A second circle beside the close button
  puts "leave" and "edit" side by side on a photo, where people go for the X without looking.
- **It is on an audited ground.** The title and meta line sit where the cover has faded into
  `surface`, which is a plain pair the audit already holds. Both circle options put a new control
  over a photo, which is the case this engagement keeps having to put a scrim under.
- **Words, not another gear.** The viewer already has two gears for in-context settings, and one
  for the cover. A third icon for "edit the whole campaign" would need a tooltip to say which gear
  it is. "Edit campaign" says it.

The editor opens as a dialog over the viewer, with its own backdrop over the viewer's, so the
viewer dims behind it. That is right, because the editor is now the subject. Escape closes only the
top dialog. When the editor closes, focus returns to "Edit campaign", and the viewer shows the saved
changes without being reopened.

**Not the cover's top-left gear, and that gear has a problem of its own.** In both halves of the
crop it overlaps the left end of the ACME badge and covers the tag icon. It is admin-only and the
badge is visible to visitors too, so the admin control is the one that moves. The badge stays where
it is, and the gear sits clear of it with at least the `xs` gap. That is easier to fix now than
after a third control joins that corner.

---

## 3. The two smaller things

**The close button matches at 0.60.** White on black 0.60 over the worst case, a white photo, is
5.74:1. An icon needs 3:1, so the margin is wide, and 0.65 buys nothing visible. One number for
"black over a photo" is worth more than 0.05. If the button needs more presence on hover, the hover
can step to 0.75. Hover adds.

**The in-context gear stays at its specified 22px, with a 24px target.** The 36px under Mantine was
the dialog's sizing leaking into it, not a choice. 22px is below WCAG 2.2's 24px minimum, though,
so give it the slider's treatment: a 22px visible circle and a 24px hit area that moves nothing. The
same applies to the cover gear once it is clear of the badge.

---

## Where it stands

| | |
|---|---|
| Order of the move | Overlays inside dialogs first, then dialogs. Agreed. |
| Scrim | Approved as built. |
| Floating Admin button | Under the backdrop. Inert test: nothing outside the top dialog paints above it. |
| Edit campaign | Subtle text button with a pencil icon, on the title's meta line, admin-only. Editor stacks over the viewer, focus returns on close. |
| Cover gear | Clears the ACME badge by at least `xs`. 24px target. |
| Close button | Black 0.60. Hover may step to 0.75. |
| In-context gear | 22px visible, 24px target. |

Nothing else is open on my side. I don't need another crop until the dialogs return.
