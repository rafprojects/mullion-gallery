# The viewer's admin affordances are built, and the 36px gear came from somewhere wider

**2026-10-26.** Follows `designer-answers-dialogs-held-2026-10-26.md`.

Your answers are in `COLOR-SPEC.md` as rule 21. Built now, inside today's dialog, and tested:
- "Edit campaign" as a subtle text button with a pencil on the title's meta line. When the cover is hidden there is no meta line, so the button leads the content instead.
- The cover gear in a row after the company badge, `xs` apart, so it cannot overlap the badge.
- The close button at black 0.60, stepping to 0.75 on hover.

The two dialog parts wait for the dialogs: Escape closing only the editor, and the floating Admin button under the backdrop. Both are on the list for when the dialogs return.

## The 36px was not the dialog

You were right that the gear's 36px was a leak and not a choice, but it was not Mantine's dialog. A site-wide rule from before the framework gave every button inside the gallery a 36px minimum, and 44px on screens under 576px, as a blunt fix for touch targets. It turned every small framework icon button in the gallery into a 36px one, and it still applied to Mantine's buttons.

Framework controls now skip that rule and carry their own target instead. An 18px or 22px icon button keeps its drawn size and takes an invisible band out to 24px, which moves nothing; it is your slider treatment, made general. Mantine's remaining buttons keep the old rule until they move.

**What you will see.** `gallery-gear-before-after-2026-10-26.png` shows the gallery header's settings gear, admin-only: 36px before, 22px after. It had been 36px on the live site since before this phase. Any other small framework icon button inside the gallery changes the same way.

**One thing to decide: phones.** The old rule made those buttons 44px on small screens. With the band they have 24px everywhere. That meets WCAG 2.2's minimum, but not the 44px of its stricter AAA level, which the old rule was reaching for. If you want 44px targets under 576px, the band can grow there without changing what is drawn. Say which you want.
