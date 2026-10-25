/**
 * P80-C: the notification and confirmation managers, proved where it matters.
 *
 * Three things here cannot be settled in jsdom:
 *
 *  - the toast is a *portaled, fixed-position* element, so whether it is
 *    actually on screen and above the page is a cascade and layout question;
 *  - the state rules the sheet keys on (`data-starting-style`, `data-limited`)
 *    are written by the primitive during a transition that jsdom never runs;
 *  - axe composites what it measures, and P80-B learned from a slider bubble
 *    that a hidden element at `opacity: 0` gets measured against the page
 *    rather than skipped.
 *
 * The fixture is `src/ui/showcase/mount.tsx` with `?managers=1`, opt-in so the
 * existing snapshot baselines render what they rendered before. Unlike every
 * other section it mounts once rather than per-gallery, because both stores are
 * module singletons.
 */

import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROOT_MARKUP = '<div id="root"></div>';
const SHOWCASE =
  '<div id="showcase"></div>\n    <script type="module" src="/src/ui/showcase/mount.tsx"></script>';

type Mount = 'shadow' | 'light';

async function serveShowcase(page: Page) {
  await page.route('**/ui-showcase*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    // Playwright reuses keep-alive sockets, and one the dev server has just closed resets (P80-F).
    const index = await (await route.fetch({ url: `${origin}/`, maxRetries: 2 })).text();
    if (!index.includes(ROOT_MARKUP)) {
      throw new Error(`dev index page no longer contains ${ROOT_MARKUP}; update the showcase fixture`);
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: index.replace(ROOT_MARKUP, SHOWCASE),
    });
  });
}

async function open(
  page: Page,
  { mount = 'shadow', theme = 'default-dark', extra = '' }: { mount?: Mount; theme?: string; extra?: string } = {},
) {
  await serveShowcase(page);
  await page.goto(`/ui-showcase?managers=1&mount=${mount}&chrome=lock&theme=${theme}${extra}`);
  await page.locator('[data-testid="managers"]').waitFor();
}

const trigger = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`);

/**
 * axe's `include` takes a plain CSS selector, which stops at a shadow boundary.
 * Both the toast viewport and the confirm dialog live in the overlay root,
 * which is a shadow tree in every mount mode. The crossing is `fromShadowDom`:
 * a plain array is a FRAME chain, matched nothing, and these gates passed on an
 * empty scan until P80-F, so each now proves it reached its target.
 */
const within = (selector: string) => ({ fromShadowDom: ['[data-mullion-overlay-root]', selector] as [string, string] });

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
/** Scan after the entry transition: a popup mid-fade reads as a contrast failure. */
const settle = (target: Locator) =>
  target.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
const reached = (results: AxeResults, cls: string) =>
  [...results.passes, ...results.violations, ...results.incomplete].flatMap((r) => r.nodes).some((n) => n.html.includes(cls));

/** The viewport lives in the overlay root, which is a second shadow tree. */
const viewport = (page: Page) => page.locator('.mullion-toast-viewport');
const toasts = (page: Page) => page.locator('.mullion-toast');

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await browser.newPage();
  try {
    await open(page);
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// The toast
// ---------------------------------------------------------------------------

test.describe('the toast', () => {
  test('renders in the overlay root, on screen and above the page', async ({ page }) => {
    await open(page);
    await trigger(page, 'notify-danger').click();
    await expect(toasts(page)).toHaveCount(1);

    const placement = await viewport(page).evaluate((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        position: style.position,
        zIndex: style.zIndex,
        inOverlayRoot: el.getRootNode() instanceof ShadowRoot,
        onScreen:
          box.width > 0 &&
          box.height > 0 &&
          box.bottom <= window.innerHeight + 1 &&
          box.right <= window.innerWidth + 1,
      };
    });

    expect(placement.position).toBe('fixed');
    expect(placement.onScreen, 'the stack is off screen').toBe(true);
    expect(placement.inOverlayRoot, 'the toast is not in the overlay root').toBe(true);
    // The layer token resolves to a number rather than the literal `auto`,
    // which is what it reads as when the custom property is missing.
    expect(Number(placement.zIndex)).toBeGreaterThan(0);
  });

  test('the ground is drawn by a border, because the elevation ladder has no rung for it', async ({
    page,
  }) => {
    await open(page);
    await trigger(page, 'notify-plain').click();
    const drawn = await toasts(page).first().evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        borderWidth: style.borderTopWidth,
        borderColor: style.borderTopColor,
        background: style.backgroundColor,
      };
    });
    expect(drawn.borderWidth).not.toBe('0px');
    expect(drawn.borderColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(drawn.background).not.toBe('rgba(0, 0, 0, 0)');
  });

  /*
   * The strong form of the P77-C guard, in a browser: the attribute is read out
   * of the sheet in the unit suite, and here the rule is proved to actually
   * paint. A toast held back by the limit must be invisible AND not merely
   * transparent, because axe measures an `opacity: 0` element against the page.
   */
  test('a toast held back by the limit is hidden by visibility, not by opacity alone', async ({
    page,
  }) => {
    await open(page);
    for (let i = 0; i < 7; i += 1) {
      await trigger(page, 'notify-plain').click();
    }
    await expect.poll(async () => await toasts(page).count()).toBeGreaterThan(5);

    const limited = page.locator('.mullion-toast[data-limited]');
    await expect(limited).not.toHaveCount(0);
    await expect(limited.first()).toHaveCSS('visibility', 'hidden');
  });

  test('the close button dismisses its own toast and leaves the rest', async ({ page }) => {
    await open(page);
    await trigger(page, 'notify-danger').click();
    await trigger(page, 'notify-plain').click();
    await expect(toasts(page)).toHaveCount(2);

    await viewport(page).getByRole('button', { name: 'Dismiss' }).first().click();
    await expect(toasts(page)).toHaveCount(1);
  });

  test('clean() empties the stack', async ({ page }) => {
    await open(page);
    await trigger(page, 'notify-danger').click();
    await trigger(page, 'notify-plain').click();
    await expect(toasts(page)).toHaveCount(2);

    await trigger(page, 'notify-clean').click();
    await expect(toasts(page)).toHaveCount(0);
  });

  test('the close button takes the framework ring, not the browser default', async ({ page }) => {
    await open(page);
    await trigger(page, 'notify-danger').click();
    const close = viewport(page).getByRole('button', { name: 'Dismiss' }).first();

    /*
     * Reached with the keyboard rather than `.focus()`. After a pointer click
     * a programmatic focus does not match `:focus-visible` in Chromium, so the
     * framework rule would not apply and the measurement would be of the user
     * agent's own ring: the first draft of this test read 3px that way, which
     * is Chromium's `outline: auto`, not the 2px core P77-F specifies.
     */
    await page.keyboard.press('F6');
    await close.focus();
    const ring = await close.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        width: style.outlineWidth,
        style: style.outlineStyle,
        shadow: style.boxShadow,
        matches: el.matches(':focus-visible'),
      };
    });
    expect(ring.matches, 'the close button is not focus-visible').toBe(true);
    expect(ring.style, 'the browser default ring is showing instead of ours').not.toBe('auto');
    expect(ring.width).toBe('2px');
    expect(ring.shadow, 'the outset halo is missing').not.toBe('none');
  });

  /*
   * The live region. Base UI names it in English by default, which would be the
   * one untranslated string in the framework's chrome; `<Notifications label>`
   * is required for that reason and this proves the name reaches the element.
   */
  test('the viewport is a polite live region carrying the supplied name', async ({ page }) => {
    await open(page);
    await trigger(page, 'notify-danger').click();
    await expect(viewport(page)).toHaveAttribute('aria-live', 'polite');
    await expect(viewport(page)).toHaveAttribute('aria-label', 'Notifications');
  });
});

// ---------------------------------------------------------------------------
// The confirm dialog
// ---------------------------------------------------------------------------

test.describe('the confirm dialog', () => {
  test('opens with both labels and closes on the confirm press', async ({ page }) => {
    await open(page);
    await trigger(page, 'confirm-open').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Discard changes?')).toBeVisible();

    await dialog.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Escape dismisses it', async ({ page }) => {
    await open(page);
    await trigger(page, 'confirm-open').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  /*
   * Focus moves into the dialog and comes back to the trigger, which is the
   * defect the product has today: a trigger inside the gallery shadow root
   * loses focus to the body when a Mantine modal closes.
   */
  test('focus enters the dialog and returns to the trigger, across the shadow boundary', async ({
    page,
  }) => {
    await open(page);
    await trigger(page, 'confirm-open').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();

    const inside = await page.evaluate(() => {
      function deepActive(root: Document | ShadowRoot): Element | null {
        const el = root.activeElement;
        if (el?.shadowRoot) return deepActive(el.shadowRoot);
        return el;
      }
      const el = deepActive(document);
      return el?.closest('.mullion-confirm') !== null;
    });
    expect(inside, 'focus did not enter the dialog').toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () =>
      page.evaluate(() => {
        function deepActive(root: Document | ShadowRoot): Element | null {
          const el = root.activeElement;
          if (el?.shadowRoot) return deepActive(el.shadowRoot);
          return el;
        }
        return deepActive(document)?.getAttribute('data-testid') ?? null;
      }),
    ).toBe('confirm-open');
  });

  test('the confirm button carries the tone the call asked for', async ({ page }) => {
    await open(page);
    await trigger(page, 'confirm-open').click();
    const button = page.getByRole('dialog').getByRole('button', { name: 'Discard' });
    await expect(button).toHaveAttribute('data-mullion-tone', 'danger');
  });
});

// ---------------------------------------------------------------------------
// One host per page (P80-F)
// ---------------------------------------------------------------------------

/*
 * A second gallery on the page mounts its own hosts. Mantine's hosts, mounted
 * that way until P80-F, rendered each toast twice and opened each confirmation
 * twice, and confirming both ran the action twice (measured 2026-10-02).
 */
test.describe('a page with two galleries', () => {
  for (const mount of ['shadow', 'light'] as const) {
    test(`one notify shows one toast and one confirm opens one dialog (${mount})`, async ({ page }) => {
      await open(page, { mount, extra: '&twin=1' });
      await page.locator('[data-testid="twin-ready"]').waitFor();
      expect(await page.locator('.mullion-toast-viewport').count(), 'one viewport for the page').toBe(1);

      await trigger(page, 'notify-danger').click();
      await expect(toasts(page)).toHaveCount(1);
      await page.waitForTimeout(400);
      await expect(toasts(page), 'a second host rendered the same toast').toHaveCount(1);

      await trigger(page, 'confirm-open').click();
      await expect(page.locator('.mullion-confirm')).toHaveCount(1);
      await page.waitForTimeout(400);
      await expect(page.locator('.mullion-confirm'), 'a second host opened the same confirmation').toHaveCount(1);
    });
  }
});

// ---------------------------------------------------------------------------
// The axe gate
// ---------------------------------------------------------------------------

test.describe('the axe gate', () => {
  test('a rendered toast has valid roles, names and ARIA', async ({ page }) => {
    await open(page, { mount: 'light' });
    await trigger(page, 'notify-danger').click();
    await trigger(page, 'notify-plain').click();
    await expect(toasts(page)).toHaveCount(2);
    await settle(viewport(page));

    const results = await new AxeBuilder({ page }).include(within('.mullion-toast-viewport')).analyze();
    expect(reached(results, 'mullion-toast'), 'axe never reached the toasts').toBe(true);
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(serious, serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')).toHaveLength(0);
  });

  test('a rendered confirm dialog has valid roles, names and ARIA', async ({ page }) => {
    await open(page, { mount: 'light' });
    await trigger(page, 'confirm-open').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await settle(page.locator('.mullion-confirm'));

    const results = await new AxeBuilder({ page }).include(within('.mullion-confirm')).analyze();
    expect(reached(results, 'mullion-confirm'), 'axe never reached the dialog').toBe(true);
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(serious, serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')).toHaveLength(0);
  });
});
