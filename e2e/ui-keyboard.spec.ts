/**
 * P80-D: the keyboard gate, automated.
 *
 * Phase 80 Key Decision C counts a component done only when its keyboard
 * contract is proved. This suite states that contract per component family and
 * asserts it in a browser, on the configuration the product ships: the
 * `overlay-root` portal default, on both the shadow and the light mount. The
 * shadow mount matters most, because focus crossing a shadow boundary and
 * ID-referenced ARIA resolving between roots are the defect classes this
 * framework exists to remove, and neither can occur in Storybook.
 *
 * The contracts are the WAI-ARIA Authoring Practices' patterns as Phase 80
 * built them, including its two deliberate departures: tabs activate manually
 * (arrows move focus, Enter selects) and the accordion takes no arrow keys.
 * One correction to the original §6B script: a disabled menu item is
 * focusable and inert, not skipped, which is what the Authoring Practices
 * recommend so a screen-reader user can find it.
 *
 * Contracts that already have a browser test elsewhere are not restated here.
 * `docs/guides/ACCESSIBILITY_MANUAL_AUDIT.md` §6B maps every check to the test
 * that proves it, in this file or another.
 *
 * Known defects are written as the contract they should meet and marked
 * `test.fail()` with the Phase 80 item that owns them. When the fix lands the
 * test passes, Playwright reports the unexpected pass as a failure, and the
 * annotation has to be removed: a known defect cannot quietly stay known.
 *
 * The fixture is `src/ui/showcase/index.html?keyboard=1`, the same page a
 * person opens for the screen-reader pass (P80-E).
 */

import { test, expect, type Page } from '@playwright/test';

type Mount = 'shadow' | 'light';
const MOUNTS: Mount[] = ['shadow', 'light'];

/** The owner of the cross-root defects below, so the annotations agree. */
const PORTAL_SPLIT =
  'P80-F item 4: the popup is portalled into the overlay root, a different root from its trigger';

async function open(page: Page, mount: Mount) {
  await page.goto(`/src/ui/showcase/index.html?keyboard=1&mount=${mount}&theme=default-dark&chrome=lock`);
  await page.locator('[data-testid="inline-keyboard"]').waitFor();
}

const byId = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`);

/**
 * Press a key at a human cadence. Base UI contains focus by letting the browser
 * move it to a guard and then redirecting, which settles over a frame or two,
 * and back-to-back synthetic presses outrun it (P80-A).
 */
async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(120);
}

interface Focused {
  testid: string | null;
  role: string;
  name: string;
  /** The framework popup the focused element is inside, if any. */
  popup: string | null;
  visible: boolean;
}

/**
 * The element that really has focus. From the document's side
 * `document.activeElement` is a shadow host, so this walks into each shadow root
 * until it reaches the focused element itself.
 */
async function focused(page: Page): Promise<Focused | null> {
  return page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    if (!el || el === document.body) return null;
    const own = el.getAttribute('aria-label');
    const labelled = (el as HTMLInputElement).labels?.[0]?.textContent;
    // Most specific first: a confirm dialog is also a modal.
    const popups = ['confirm', 'toast-viewport', 'menu', 'popover', 'drawer', 'modal'];
    const popup = popups.find((name) => el!.closest(`.mullion-${name}`)) ?? null;
    return {
      testid: el.getAttribute('data-testid'),
      role: el.getAttribute('role') ?? el.tagName.toLowerCase(),
      name: (own ?? labelled ?? el.textContent ?? '').trim(),
      popup: popup ? `mullion-${popup}` : null,
      visible: el.matches(':focus-visible'),
    };
  });
}

/**
 * Whether the focused control paints the framework's indicator. The ring sits on
 * the control itself, on the next sibling for a chip's clipped input, on the
 * field row for a text field, or on the thumb for a slider's hidden input; it is
 * an outline of at least 2px or the inset variant's box-shadow, never the user
 * agent's `auto` outline.
 */
async function indicator(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    if (!el) return null;
    const candidates = [
      el,
      el.nextElementSibling,
      el.closest('.mullion-field-control'),
      el.closest('.mullion-slider-thumb'),
    ].filter((node): node is Element => node !== null);
    for (const node of candidates) {
      const cs = getComputedStyle(node);
      if (cs.outlineStyle === 'solid' && parseFloat(cs.outlineWidth) >= 2) return 'outline';
      if (/inset/.test(cs.boxShadow)) return 'inset';
    }
    return null;
  });
}

const focusName = async (page: Page) => (await focused(page))?.name ?? null;

// ---------------------------------------------------------------------------
// Modal and drawer
// ---------------------------------------------------------------------------

test.describe('modal and drawer', () => {
  for (const mount of MOUNTS) {
    for (const which of ['modal', 'drawer'] as const) {
      test(`${which} (${mount}): Enter opens it with focus inside, Tab and Shift+Tab stay inside, Escape returns focus`, async ({
        page,
      }) => {
        await open(page, mount);
        await byId(page, `inline-${which}-trigger`).focus();
        await press(page, 'Enter');
        await expect.poll(async () => (await focused(page))?.popup).toBe(`mullion-${which}`);

        const stops: string[] = [];
        for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
          await press(page, key);
          const f = await focused(page);
          stops.push(f?.popup === `mullion-${which}` ? 'in' : `out: ${f?.role} "${f?.name}"`);
        }
        expect(stops.filter((s) => s !== 'in'), `focus left the ${which}`).toEqual([]);

        await press(page, 'Escape');
        await expect(page.locator(`.mullion-${which}`)).toHaveCount(0);
        await expect.poll(async () => (await focused(page))?.testid).toBe(`inline-${which}-trigger`);
      });
    }
  }

  test('the dialog is named by its title', async ({ page }) => {
    await open(page, 'shadow');
    await byId(page, 'inline-modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toMatchAriaSnapshot(`
      - dialog "inline modal":
        - button "inside the modal"
    `);
  });

  // `<header>` inside a dialog is exposed as a second `banner` landmark, so a
  // screen reader announces "banner" inside every modal and drawer.
  test('a dialog adds no landmark of its own', async ({ page }) => {
    test.fail(true, 'P80-F: the dialog header is a <header>, exposed as a banner landmark');
    await open(page, 'shadow');
    await byId(page, 'inline-modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toBeVisible();
    await expect(page.locator('.mullion-modal').getByRole('banner')).toHaveCount(0, { timeout: 1500 });
  });
});

// ---------------------------------------------------------------------------
// Popover and tooltip
// ---------------------------------------------------------------------------

test.describe('popover and tooltip', () => {
  for (const mount of MOUNTS) {
    test(`popover (${mount}): Enter and Space open it with focus inside, Escape returns focus`, async ({ page }) => {
      await open(page, mount);
      for (const key of ['Enter', 'Space']) {
        await byId(page, 'inline-popover-trigger').focus();
        await press(page, key);
        await expect.poll(async () => (await focused(page))?.popup).toBe('mullion-popover');
        await press(page, 'Escape');
        await expect.poll(async () => (await focused(page))?.testid).toBe('inline-popover-trigger');
      }
    });

    // The Authoring Practices' non-modal dialog: Tab leaves it and it closes.
    test(`popover (${mount}): Tab closes it and moves on`, async ({ page }) => {
      test.fail(true, PORTAL_SPLIT);
      await open(page, mount);
      await byId(page, 'inline-popover-trigger').focus();
      await press(page, 'Enter');
      await expect.poll(async () => (await focused(page))?.popup).toBe('mullion-popover');
      await press(page, 'Tab');
      await expect.poll(async () => (await focused(page))?.popup ?? 'outside', { timeout: 1500 }).toBe('outside');
      await expect(page.locator('.mullion-popover')).toHaveCount(0, { timeout: 1500 });
    });

    test(`tooltip (${mount}): opens on keyboard focus and Escape dismisses it`, async ({ page }) => {
      await open(page, mount);
      await byId(page, 'inline-popover-trigger').focus();
      await press(page, 'Tab');
      expect(await focusName(page)).toBe('inline tooltip');
      await expect(page.locator('.mullion-tooltip')).toBeVisible();
      await press(page, 'Escape');
      await expect(page.locator('.mullion-tooltip')).toHaveCount(0);
    });
  }

  // The control for the defect above: trigger and popup in the same root.
  test('popover: Tab closes it when trigger and popup share a root', async ({ page }) => {
    await open(page, 'shadow');
    await byId(page, 'overlay-popover-trigger').focus();
    await press(page, 'Enter');
    await expect.poll(async () => (await focused(page))?.popup).toBe('mullion-popover');
    await press(page, 'Tab');
    await expect.poll(async () => (await focused(page))?.popup ?? 'outside').toBe('outside');
    await expect(page.locator('.mullion-popover')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

test.describe('menu', () => {
  for (const mount of MOUNTS) {
    test(`menu (${mount}): Enter, Space and ArrowDown each open it on the first item`, async ({ page }) => {
      await open(page, mount);
      for (const key of ['Enter', 'Space', 'ArrowDown']) {
        await byId(page, 'inline-long-menu-trigger').focus();
        await press(page, key);
        await expect.poll(() => focusName(page), { message: `opened by ${key}` }).toBe('archive');
        await press(page, 'Escape');
        await expect.poll(async () => (await focused(page))?.testid).toBe('inline-long-menu-trigger');
      }
    });

    test(`menu (${mount}): arrows, Home, End and typeahead move; a disabled item is focusable and inert`, async ({
      page,
    }) => {
      await open(page, mount);
      await byId(page, 'inline-long-menu-trigger').focus();
      await press(page, 'Enter');
      await expect.poll(() => focusName(page)).toBe('archive');

      const visited: (string | null)[] = [];
      for (const key of ['ArrowDown', 'ArrowDown', 'End', 'Home', 'ArrowUp', 'r']) {
        await press(page, key);
        visited.push(await focusName(page));
      }
      // ArrowUp from the first item wraps to the last, which is Base UI's default.
      expect(visited).toEqual(['copy link', 'disabled export', 'share', 'archive', 'share', 'rename']);

      await press(page, 'ArrowUp');
      expect(await focusName(page)).toBe('disabled export');
      expect(
        await page.evaluate(() => {
          let el: Element | null = document.activeElement;
          while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
          return el?.getAttribute('aria-disabled');
        }),
      ).toBe('true');
      // Read once after a close would have finished: a retrying visibility check
      // passes at once, before the menu has had time to close (the first draft).
      await press(page, 'Enter');
      await page.waitForTimeout(500);
      expect(await byId(page, 'inline-long-menu').isVisible(), 'Enter activated a disabled item').toBe(true);
      await expect(byId(page, 'inline-long-menu-picked')).toHaveText('picked: none');
    });

    test(`menu (${mount}): Enter activates an item and Escape closes, both returning focus`, async ({ page }) => {
      await open(page, mount);
      await byId(page, 'inline-long-menu-trigger').focus();
      await press(page, 'Enter');
      await press(page, 'r');
      await press(page, 'Enter');
      await expect(byId(page, 'inline-long-menu-picked')).toHaveText('picked: rename');
      await expect.poll(async () => (await focused(page))?.testid).toBe('inline-long-menu-trigger');
    });

    // The Authoring Practices: Tab in a menu closes it and moves focus on.
    test(`menu (${mount}): Tab closes it and moves on`, async ({ page }) => {
      test.fail(true, PORTAL_SPLIT);
      await open(page, mount);
      await byId(page, 'inline-long-menu-trigger').focus();
      await press(page, 'Enter');
      await expect.poll(() => focusName(page)).toBe('archive');
      await press(page, 'Tab');
      await expect.poll(async () => (await focused(page))?.popup ?? 'outside', { timeout: 1500 }).toBe('outside');
    });

    // The menu is labelled by its trigger through `aria-labelledby`, an ID
    // reference that cannot resolve from the overlay root into another root.
    test(`menu (${mount}): the menu is named by its trigger`, async ({ page }) => {
      test.fail(true, PORTAL_SPLIT);
      await open(page, mount);
      await byId(page, 'inline-long-menu-trigger').click();
      await expect(byId(page, 'inline-long-menu')).toMatchAriaSnapshot(
        `- menu "inline long menu"`,
        { timeout: 1500 },
      );
    });
  }

  // The controls for the two defects above: trigger and menu in the same root.
  test('menu: Tab closes it and the menu is named, when trigger and menu share a root', async ({ page }) => {
    await open(page, 'shadow');
    await byId(page, 'overlay-long-menu-trigger').click();
    await expect(byId(page, 'overlay-long-menu')).toMatchAriaSnapshot(`
      - menu "overlay long menu":
        - menuitem "archive"
        - menuitem "copy link"
        - menuitem "disabled export" [disabled]
        - menuitem "rename"
        - menuitem "share"
    `);
    await page.keyboard.press('Escape');
    await byId(page, 'overlay-long-menu-trigger').focus();
    await press(page, 'Enter');
    await expect.poll(() => focusName(page)).toBe('archive');
    await press(page, 'Tab');
    await expect.poll(async () => (await focused(page))?.popup ?? 'outside').toBe('outside');
  });
});

// ---------------------------------------------------------------------------
// The input family
// ---------------------------------------------------------------------------

test.describe('the input family', () => {
  for (const mount of MOUNTS) {
    test(`fields (${mount}): Tab reaches each in order, named, with the ring`, async ({ page }) => {
      await open(page, mount);
      await page.getByRole('textbox', { name: 'inline gallery name' }).focus();
      const stops: { name: string | null; ring: string | null }[] = [];
      stops.push({ name: await focusName(page), ring: await indicator(page) });
      for (let i = 0; i < 4; i += 1) {
        await press(page, 'Tab');
        stops.push({ name: await focusName(page), ring: await indicator(page) });
      }
      expect(stops.map((s) => s.name)).toEqual([
        'inline gallery name',
        'inline caption',
        'inline api key',
        'Show password',
        'inline gap',
      ]);
      expect(stops.filter((s) => s.ring === null).map((s) => s.name), 'stops with no ring').toEqual([]);
    });

    test(`password (${mount}): the reveal control toggles by keyboard and reports its state`, async ({ page }) => {
      await open(page, mount);
      const field = page.getByRole('textbox', { name: 'inline api key' });
      const reveal = byId(page, 'inline-keyboard').getByRole('button', { name: 'Show password' });
      await field.focus();
      await press(page, 'Tab');
      await expect(reveal).toHaveAttribute('aria-pressed', 'false');
      await press(page, 'Space');
      await expect(reveal).toHaveAttribute('aria-pressed', 'true');
      await expect(field).toHaveAttribute('type', 'text');
    });

    test(`password (${mount}): the value is masked until it is revealed`, async ({ page }) => {
      test.fail(true, "P80-F: PasswordInput passes type undefined rather than 'password' while hidden");
      await open(page, mount);
      const field = page.getByRole('textbox', { name: 'inline api key' });
      await field.fill('secret');
      expect(await field.evaluate((el: HTMLInputElement) => el.type)).toBe('password');
    });

    test(`number (${mount}): arrows step, Home and End go to the bounds, and it clamps`, async ({ page }) => {
      await open(page, mount);
      const field = page.getByRole('textbox', { name: 'inline gap' });
      await field.focus();
      const values: string[] = [];
      for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'End', 'ArrowUp', 'Home', 'ArrowDown']) {
        await press(page, key);
        values.push(await field.inputValue());
      }
      expect(values).toEqual(['14', '16', '14', '20', '20', '0', '0']);
    });
  }
});

// ---------------------------------------------------------------------------
// The select family
// ---------------------------------------------------------------------------

test.describe('the select family', () => {
  for (const mount of MOUNTS) {
    // Arrow keys, Enter, Escape and filtering are proved in ui-selects.spec.ts.
    // Opened first, then typed: a Space pressed inside a typeahead session is a
    // character of the search, as the Authoring Practices specify, not a command.
    test(`select (${mount}): Space opens it with focus on an option, and typing on the closed field picks`, async ({
      page,
    }) => {
      await open(page, mount);
      const trigger = byId(page, 'inline-select-trigger');
      await trigger.focus();
      await press(page, 'Space');
      await expect.poll(async () => (await focused(page))?.role).toBe('option');
      await press(page, 'Escape');
      await expect.poll(async () => (await focused(page))?.testid).toBe('inline-select-trigger');

      await press(page, 'v');
      await expect(trigger).toContainText('Viewer');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test(`multiselect (${mount}): Enter picks and keeps it open, Backspace removes the last pick`, async ({ page }) => {
      await open(page, mount);
      const field = page.getByRole('combobox', { name: 'inline roles' });
      const picked = byId(page, 'inline-keyboard').locator('.mullion-select-chip');
      await field.focus();
      await press(page, 'ArrowDown');
      await press(page, 'Enter');
      await expect(field).toHaveAttribute('aria-expanded', 'true');
      await press(page, 'ArrowDown');
      await press(page, 'Enter');
      await press(page, 'Escape');
      await expect(picked).toHaveCount(2);
      // Focus never leaves the field: the option is named by aria-activedescendant.
      expect(await focusName(page)).toBe('inline roles');
      await press(page, 'Backspace');
      await expect(picked).toHaveCount(1);
    });

    test(`tags (${mount}): Enter adds what was typed, Backspace on an empty field removes the last`, async ({
      page,
    }) => {
      await open(page, mount);
      const field = page.getByRole('combobox', { name: 'inline tags' });
      const chips = byId(page, 'inline-selects').locator('.mullion-select-chip');
      await field.focus();
      for (const word of ['alpha', 'beta']) {
        await page.keyboard.type(word);
        await press(page, 'Enter');
      }
      await expect(chips).toHaveCount(2);
      await press(page, 'Backspace');
      await expect(chips).toHaveCount(1);
      await expect(chips.first()).toContainText('alpha');
    });
  }
});

// ---------------------------------------------------------------------------
// Tabs, segmented control and accordion
// ---------------------------------------------------------------------------

test.describe('tabs, segmented control and accordion', () => {
  for (const mount of MOUNTS) {
    // Arrow-then-Enter manual activation is proved in ui-choices.spec.ts.
    test(`tabs (${mount}): Home and End move focus, and Tab moves into the panel`, async ({ page }) => {
      await open(page, mount);
      await byId(page, 'inline-tab-one').focus();
      await press(page, 'End');
      expect(await focusName(page)).toBe('third');
      await press(page, 'Home');
      expect(await focusName(page)).toBe('first');
      await press(page, 'End');
      await press(page, 'Enter');
      await press(page, 'Tab');
      const f = await focused(page);
      expect(f?.role).toBe('tabpanel');
      expect(f?.name).toBe('third panel');
    });

    test(`segmented control (${mount}): one tab stop, and arrows move the choice`, async ({ page }) => {
      await open(page, mount);
      const group = page.getByRole('radiogroup', { name: 'inline view mode' });
      await group.getByRole('radio', { name: 'grid' }).focus();
      await press(page, 'ArrowRight');
      await expect(group.getByRole('radio', { name: 'list' })).toBeChecked();
      await press(page, 'Tab');
      expect((await focused(page))?.role).toBe('tab');
    });

    test(`accordion (${mount}): Enter and Space toggle a section, and the arrows do nothing`, async ({ page }) => {
      await open(page, mount);
      const control = byId(page, 'inline-accordion-b');
      await control.focus();
      await press(page, 'Enter');
      await expect(control).toHaveAttribute('aria-expanded', 'true');
      await press(page, 'Space');
      await expect(control).toHaveAttribute('aria-expanded', 'false');
      // Roving focus was removed from this pattern (w3c/aria-practices#3434).
      await press(page, 'ArrowUp');
      expect((await focused(page))?.testid).toBe('inline-accordion-b');
    });
  }
});

// ---------------------------------------------------------------------------
// The choice controls, pagination and the colour picker
// ---------------------------------------------------------------------------

test.describe('the choice controls, pagination and the colour picker', () => {
  for (const mount of MOUNTS) {
    test(`checkbox and switch (${mount}): Space toggles both, Enter toggles only the switch`, async ({ page }) => {
      await open(page, mount);
      const box = page.getByRole('checkbox', { name: 'inline purge analytics' });
      const toggle = page.getByRole('switch', { name: 'inline backdrop blur' });
      await box.focus();
      await press(page, 'Space');
      await expect(box).toBeChecked();
      await press(page, 'Enter');
      await expect(box).toBeChecked();
      await toggle.focus();
      await press(page, 'Space');
      await expect(toggle).not.toBeChecked();
      await press(page, 'Enter');
      await expect(toggle).toBeChecked();
    });

    test(`slider (${mount}): arrows step, Page keys take the large step, Home and End go to the bounds`, async ({
      page,
    }) => {
      await open(page, mount);
      const slider = page.getByRole('slider', { name: 'inline opacity' });
      await slider.focus();
      const values: (string | null)[] = [];
      for (const key of ['ArrowRight', 'ArrowLeft', 'PageDown', 'End', 'ArrowRight', 'Home']) {
        await press(page, key);
        values.push(await slider.getAttribute('aria-valuenow'));
      }
      expect(values).toEqual(['0.55', '0.5', '0', '1', '1', '0']);
    });

    // Focus lands on the hidden range input inside the thumb, and the ring rule
    // only matches a thumb that is itself focused.
    test(`slider (${mount}): the thumb paints the ring under keyboard focus`, async ({ page }) => {
      test.fail(true, 'P80-F: the ring rule never matches the thumb, so the slider has no visible focus');
      await open(page, mount);
      await page.getByRole('switch', { name: 'inline backdrop blur' }).focus();
      await press(page, 'Tab');
      expect((await focused(page))?.role).toBe('input');
      expect(await indicator(page)).not.toBeNull();
    });

    test(`pagination (${mount}): every page is a tab stop, and Enter makes it current`, async ({ page }) => {
      await open(page, mount);
      const nav = page.getByRole('navigation', { name: 'inline pages' });
      await nav.getByRole('button', { name: 'Previous page' }).focus();
      await press(page, 'Tab');
      await press(page, 'Tab');
      expect(await focusName(page)).toBe('Page 2');
      await press(page, 'Enter');
      await expect(nav.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
    });

    test(`colour input (${mount}): the swatch opens the picker on its surface, and Escape returns`, async ({
      page,
    }) => {
      await open(page, mount);
      const field = page.getByRole('textbox', { name: 'inline background colour' });
      await field.focus();
      await press(page, 'Shift+Tab');
      expect(await focusName(page)).toBe('Open the colour picker');
      await press(page, 'Enter');
      await expect.poll(async () => (await focused(page))?.role).toBe('slider');

      const before = await field.inputValue();
      await press(page, 'ArrowRight');
      await expect.poll(() => field.inputValue()).not.toBe(before);

      const walk: (string | null)[] = [];
      for (let i = 0; i < 3; i += 1) {
        await press(page, 'Tab');
        walk.push(await focusName(page));
      }
      expect(walk).toEqual(['Hue', 'Opacity', 'Use #102530']);
      await press(page, 'Escape');
      await expect.poll(() => focusName(page)).toBe('Open the colour picker');
    });
  }
});

// ---------------------------------------------------------------------------
// The managers
// ---------------------------------------------------------------------------

test.describe('the managers', () => {
  for (const mount of MOUNTS) {
    test(`toast (${mount}): F6 reaches the stack, Tab the close button, and Enter dismisses and restores focus`, async ({
      page,
    }) => {
      await open(page, mount);
      await byId(page, 'notify-danger').click();
      await expect(page.locator('.mullion-toast')).toHaveCount(1);
      await byId(page, 'inline-tab-one').focus();

      await press(page, 'F6');
      expect((await focused(page))?.role).toBe('region');
      await press(page, 'Tab');
      await press(page, 'Tab');
      expect(await focusName(page)).toBe('Dismiss');
      expect(await indicator(page), 'the close button paints no ring').not.toBeNull();
      await press(page, 'Enter');
      await expect(page.locator('.mullion-toast')).toHaveCount(0);
      await expect.poll(async () => (await focused(page))?.testid).toBe('inline-tab-one');
    });

    // Focus and Escape-return are proved in ui-managers.spec.ts.
    test(`confirm (${mount}): Tab and Shift+Tab stay inside the dialog`, async ({ page }) => {
      await open(page, mount);
      await byId(page, 'confirm-open').focus();
      await press(page, 'Enter');
      await expect.poll(async () => (await focused(page))?.popup).toBe('mullion-confirm');
      const stops: (string | null)[] = [];
      for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
        await press(page, key);
        stops.push((await focused(page))?.popup ?? null);
      }
      expect(stops.every((s) => s === 'mullion-confirm'), `focus left the dialog: ${stops.join(', ')}`).toBe(true);
    });
  }

  // The toast root takes focus on the F6 path, so it needs the ring like any
  // other keyboard stop (WCAG 2.4.7).
  test('toast: the toast itself paints an indicator when it has focus', async ({ page }) => {
    test.fail(true, 'P80-F: the toast root is focusable but carries no framework focus attribute');
    await open(page, 'shadow');
    await byId(page, 'notify-danger').click();
    await byId(page, 'inline-tab-one').focus();
    await press(page, 'F6');
    await press(page, 'Tab');
    expect((await focused(page))?.role).toBe('dialog');
    expect(await indicator(page)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What a screen reader is given
// ---------------------------------------------------------------------------

/*
 * The accessibility tree each family exposes: role, name and state. This is the
 * half of the screen-reader check a machine can prove; what is actually spoken
 * is P80-E's. Templates match partially, so they pin the parts that carry
 * meaning rather than every text node.
 */
test.describe('what a screen reader is given', () => {
  test('the input family', async ({ page }) => {
    await open(page, 'shadow');
    await expect(byId(page, 'inline-keyboard')).toMatchAriaSnapshot(`
      - textbox "inline gallery name"
      - textbox "inline caption"
      - textbox "inline api key"
      - button "Show password"
      - group:
        - textbox "inline gap": "12"
      - combobox "inline roles"
      - button "inline long menu"
    `);
  });

  test('the select family, closed and open', async ({ page }) => {
    await open(page, 'shadow');
    await expect(byId(page, 'inline-selects')).toMatchAriaSnapshot(`
      - combobox "inline role": pick a role
      - combobox "inline font"
      - combobox "inline tags"
    `);
    await byId(page, 'inline-select-trigger').click();
    await expect(page.getByRole('listbox')).toMatchAriaSnapshot(`
      - listbox:
        - option "Administrator"
        - option "Editor"
        - option "Viewer"
    `);
  });

  test('tabs, segmented control and accordion', async ({ page }) => {
    await open(page, 'shadow');
    await expect(byId(page, 'inline-choices')).toMatchAriaSnapshot(`
      - radiogroup "inline view mode":
        - radio "grid" [checked]
        - radio "list"
        - radio "map"
      - tablist "inline sections":
        - tab "first" [selected]
        - tab "second tab"
        - tab "third"
      - tabpanel "first": first panel
      - heading "appearance" [level=3]:
        - button "appearance" [expanded]
      - region "appearance": appearance body
      - heading "behaviour" [level=3]:
        - button "behaviour"
    `);
  });

  test('the choice controls, pagination and the colour field', async ({ page }) => {
    await open(page, 'shadow');
    await expect(byId(page, 'inline-toggles')).toMatchAriaSnapshot(`
      - checkbox "inline purge analytics"
      - checkbox "inline select all" [checked=mixed]
      - switch "inline backdrop blur" [checked]
      - group:
        - slider "inline opacity": "0.5"
      - radio "all" [checked]
      - radio "mine"
      - radio "shared"
    `);
    await expect(byId(page, 'inline-gaps')).toMatchAriaSnapshot(`
      - navigation "inline pages":
        - button "Previous page"
        - button "Page 1"
        - button "Page 20"
        - button "Next page"
      - button "Open the colour picker"
      - textbox "inline background colour"
    `);
  });

  test('the toast stack and the confirm dialog', async ({ page }) => {
    await open(page, 'shadow');
    await byId(page, 'notify-danger').click();
    await expect(page.locator('.mullion-toast-viewport')).toMatchAriaSnapshot(`
      - region "Notifications":
        - dialog "Save failed":
          - heading "Save failed" [level=2]
          - paragraph: The server rejected it.
          - button "Dismiss"
    `);
    await byId(page, 'notify-clean').click();
    await byId(page, 'confirm-open').click();
    await expect(page.locator('.mullion-confirm')).toMatchAriaSnapshot(`
      - dialog "Discard changes?":
        - text: You have unsaved changes. Discard them?
        - button "Keep editing"
        - button "Discard"
    `);
  });
});
