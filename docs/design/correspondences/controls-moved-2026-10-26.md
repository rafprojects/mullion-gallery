# The surfaces are on the ladder, the controls have moved, and two things are yours

**2026-10-26.** Follows `designer-answers-surfaces-classified-2026-10-26.md`.

Your surface rule is built: 25 surfaces moved by the classified table, the admin panel's card keeps its edge on light themes, and on the dev site's dark theme the panel shows the rung and no edge, as rule 13 says. `Paper` and `Card` gained an `elevated` option for the hairline, kept separate from the raised ground so a card at the ceiling can have a raised ground and a divider. Both of your new clauses are in rule 13.

**A correction about numbering.** I added the caption rule to `COLOR-SPEC.md` as rule 14, and told you so. Rule 14 already existed, the `border` floor from 7 October. The caption rule is rule 15; everything that called it 14 has been corrected except my earlier letters.

**And an apology.** I copied the repo's `COLOR-SPEC.md` over the one in this folder without comparing them first. If you had edited that copy yourself since 7 October, those edits are gone and I have no copy to restore them from; the 7 October snapshot in `archive/` is untouched. The file now holds everything in the repo, including today's rules. From now on I only add new dated files here.

---

## 1. The controls moved, at Mantine's geometry

Buttons, icon buttons and the small button helpers now render the framework's components across 76 files. Reading Mantine's stylesheet first found the framework had drifted from it: icon buttons were sized at the input heights (30 to 60px) instead of Mantine's 18 to 44px, button padding and compact sizes were narrower, the corners were `sm` rather than `md`, and the labels were 500 rather than the 600 your brief asks of buttons. All of that is corrected and measured, so a control is the size it was.

Colours followed your control table: blue is `primary`, gray and dark the neutral control, red, orange and green their roles. Three buttons were teal, and all three are the same action: **Restore**, on an archived campaign, in the bulk-actions bar and in both campaign lists. I made them `primary`, as an action rather than a reported outcome. Say if Restore should read as `success` instead.

On the photographed screens the visible changes are the admin's in-context settings gear, which goes from Mantine's literal blue to the brand primary, and the settings drawer's Cancel button, whose border is the framework's slightly stronger `default` variant.

## 2. Yours: what a disabled button looks like

Two crops are beside this letter, `disabled-button-light-2026-10-26.png` and `disabled-button-dark-2026-10-26.png`: the settings drawer's header before (top) and after (bottom), with Save Changes disabled because nothing has changed yet.

Mantine drew a disabled button as a different thing: a grey ground and a muted label, whatever its variant. The framework draws the button it would have been at 55% opacity. On the dark theme that reads as disabled. On the light theme it reads as an enabled primary button, slightly washed out, which is the opposite of what a disabled save should say.

Disabled text is exempt from the contrast floors, so this is about the signal rather than a number. **Which do you want:** a neutral disabled state (a muted ground and ink, the same for every variant and tone), or the faded button? I lean to the neutral one, because it says "not available" in the same way everywhere, but it is your call.

## 3. Yours: the chips

`Chip` has not moved, because it is a visible redesign on a surface visitors see: the gallery's filter row ("All", "My Access", one per company). Mantine's chip has three variants and puts a check mark in a checked chip; the framework's chip is one look, a toned wash and border when checked, with no check mark, at about the same height (28 to 29px at the gallery's size). The gallery uses the `light` variant today; the isotope adapter's filter uses `filled`.

**What should the framework chip do there?** The two questions inside it are whether a checked chip keeps a check mark (it is the non-colour signal for "selected", in the spirit of rule 5) and whether one look is enough for both filter rows. Once you have answered, the chips move in a batch of their own with a before-and-after capture of the gallery's filter row.
