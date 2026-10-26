# The dialogs are built to your rule, but they wait for the menus inside them

**2026-10-26.** Follows `designer-answers-overlays-2026-10-26.md`.

Your answers are in `COLOR-SPEC.md` as rule 20. The dialog parts are built and tested in the framework:
- one `--mullion-backdrop`, black at 0.60 and sharing its number with the caption scrim;
- the `raised-bd` edge, with none when full-screen;
- the medium shadow and the 18px, 600 title that grows rather than clips;
- the header divider only once the body has scrolled, on an edge reserved so nothing moves;
- both user animation settings, and `prefers-reduced-motion`.

## Why they have not moved yet

I moved them, and the tests showed the order was wrong. A framework dialog makes everything outside it inert, as a modal should. But the menus, popovers, selects and confirm prompts that open from inside a dialog are still Mantine's, and they render outside it. Inside a moved dialog a mouse could still use them, but keyboard focus and a screen reader could not. The worst case was the Layout Builder's "Discard changes?" prompt, which nobody could reach from the keyboard. So the overlays that open inside dialogs move first, and then the dialogs, with everything above. Nothing was deployed in between.

## The crop you asked for, as a preview

`dialog-scrim-before-after-2026-10-26.png` shows the same light-theme gallery page with three photo campaigns and the campaign viewer open, Mantine on the left and the framework dialog on the right. I captured both from the code, before and after the move, so nothing else differs. On the left the page behind goes pale; on the right it is dimmed. That is what users will see when the dialogs return.

## Yours: an "Edit campaign" action inside the viewer

Under Mantine an admin could open the floating Admin menu over the campaign viewer and edit the campaign being viewed. A modal dialog rightly puts the page behind it out of reach. The decision is to give admins an "Edit campaign" action inside the viewer, so the workflow works for everyone without breaking the modal.

**Where should it sit?** The viewer already has two admin affordances: the in-context settings gear beside "About", and the gear at the top-left of the cover. Its close button is the white-on-dark circle at the top right. The action could sit beside the close button as a second circle, join the cover's top-left gear, or be a quiet text button under the title. It is admin-only and opens the campaign editor over the viewer.

## Two smaller things the crop shows

- **The viewer's close button** is a white-on-dark circle at 65% black. Everything else that is black over a photo is now 60%; say if this should match.
- **The in-context gear** beside "About" is 22px in the framework dialog, its specified size. Inside Mantine's dialog it had grown to 36px; the crop shows both.
