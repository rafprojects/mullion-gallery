# Before the dialogs and the rest of the overlays move: what differs from Mantine, and which parts are yours

**2026-10-26.** Follows `designer-signoff-fields-2026-10-26.md`.

The off switch's thumb is `textMuted` and the password reveal is the eye in a 24px target, both tested; rule 18 now lists the switch's three states.

**One regression of mine, found and fixed.** In locked chrome, the controls I had already moved painted the gallery's theme rather than the brand. The Settings drawer and the Layout Builder take their locked palette from a Mantine provider, which the framework's tokens never saw, so on a tokyo-night gallery the drawer's Cancel and Save, its switches and its number fields were tokyo-night while the Mantine parts around them were the brand. The locked-chrome screenshot test allows a 10% difference and passed throughout. A nested framework provider now carries the chrome's mode, and a new test checks the drawer's controls resolve the brand's `surface` exactly.

---

The next batch is the overlays: dialogs and drawers, then menus, popovers, tooltips, accordions and tabs. As with the buttons and fields, I compared the framework with Mantine's stylesheet and the product's theme adapter first. Most of the differences are size and spacing, and I will match those to Mantine without asking: dialog widths, the header's height and padding, the gap above a dialog, offsets, a popover's inline padding. The framework also needs to honour the two animation settings users can choose today, the settings panel's and the campaign viewer's, which it does not yet.

What follows are the differences that change how something looks rather than how big it is. The numbers are from Mantine's stylesheet and the adapter's code, not measured on screen.

## 1. Dialogs: the scrim

Today there are two scrims. The 26 modals use the theme's own `background` at 75%, which the adapter sets, so on a light theme the page behind a dialog goes pale rather than dark. The two drawers (the Settings panel and the gallery config editor) use black at 60%. The framework has one scrim, black at 60%, chosen in Phase 80 from the drawers alone.

**One scrim for both, and which?** Black at 60% dims the page the same way on every theme; the theme-tinted one keeps a light theme light, at the cost of a weaker separation. The visitor lightbox's 93% black is separate and stays.

## 2. Dialogs: the edge, the header rule and the shadow

The adapter draws a 1px `border` round every modal and a `border` divider under its header, over Mantine's large shadow. The framework's dialog has no border, no header divider and a medium shadow. Under rule 13 a dialog paints `surface` over the dimmed page, and on a light theme elevation is carried by border and shadow, so this is your rule's territory.

**Should a dialog keep its border and the divider under its header, and which shadow?** The drawers have had no border and no divider; say if they should match the modals.

## 3. Dialogs: the title

Mantine's dialog title is 16px with a line height of 1, and the adapter makes a modal's title 600. The framework's is 18px at 600, at the heading line height. (The Settings panel draws its own larger heading inside the title, so it is unaffected either way.)

**16px or 18px?**

## 4. Accordions (the settings panel's sections)

Twelve of the product's fourteen accordions are the `separated` kind, nearly all in the settings panel; the other two are in the layout builder's panels. Mantine's: a 16px, 400-weight label, 16px of side padding, a control about 49px tall, 16px between sections, no hover fill. The framework's: 14px at 500, 12px side padding, about 42px tall, 10px between sections, and a hover tint. Moving as it stands makes the settings panel visibly denser.

**Match Mantine, or keep the denser framework accordion?**

## 5. Tabs (the settings panel's tab bar)

Mantine's tabs are all 500, 16px of side padding with no gap between them, and a filled hover. The framework's are 400 at rest and 600 when selected, 12px of padding with 10px between tabs, and a hover that changes only the ink. You kept 600 for the checked segment as its non-colour signal, with each segment reserving its width; the same could apply here.

**All 500 as Mantine had it, or 400 and 600 with each tab reserving its 600 width?** And Mantine's padding and spacing, or the framework's?

## 6. Tooltips

Mantine's tooltip is 13px at a line height of 1.55, with 8px corners, on one line unless a call site asks it to wrap. The framework's is 12px at 1.4, 4px corners, and wraps at 288px. Two tooltips and a few menus and popovers ask for Mantine's arrow; the framework draws none.

**Which size, corners and wrapping, and should arrows come back?** 13px is between the type scale's steps; 12px is `xs`.

## Kept as you settled them

Menus keep the full-bleed rows with the rail you specified on 14 September, so Mantine's inset, rounded menu items do not come back.
