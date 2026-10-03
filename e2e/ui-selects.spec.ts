/**
 * P80-B: the select family, proved where the constraint is observable.
 *
 * The unit suite can say which node a listbox was portaled into. It cannot
 * say whether a keyboard user can actually operate the control in the shipped
 * configuration, and that is the whole question here: every Mantine dropdown
 * in the product is keyboard-inoperable today because the default portal mode
 * puts the popup in a second shadow root, where the trigger's `aria-controls`
 * and `aria-activedescendant` name nothing. This suite runs against that same
 * default, inside the gallery shadow root, and drives the controls with keys.
 *
 * The fixture is `src/ui/showcase/mount.tsx` with `?selects=1`, opt-in for the
 * same reason the overlays are: every existing URL renders what it rendered
 * before, so the `ui-showcase` and `theme-qa` baselines are untouched.
 */

import { test, expect, type Page } from '@playwright/test';
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
  { mount = 'shadow', theme = 'default-dark', host = '' }: { mount?: Mount; theme?: string; host?: string } = {},
) {
  await serveShowcase(page);
  const hostParam = host ? `&host=${host}` : '';
  await page.goto(`/ui-showcase?selects=1&mount=${mount}&chrome=lock&theme=${theme}${hostParam}`);
  await page.locator('[data-testid="inline-selects"]').waitFor();
}

/** The inline set lives in the scope under test; Playwright pierces open shadow roots. */
const inline = (page: Page, id: string) => page.locator(`[data-testid="inline-${id}"]`);

/**
 * Warm the dev server. The first request for this fixture compiles the whole
 * module graph, which outruns a 30s test timeout on a cold start; the overlay
 * suite pays the same cost the same way.
 */
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
// The binding constraint
// ---------------------------------------------------------------------------

test.describe('the listbox stays in its trigger’s root', () => {
  for (const mount of ['shadow', 'light'] as const) {
    test(`on the ${mount} mount, the popup and the trigger share a root`, async ({ page }) => {
      await open(page, { mount });
      await inline(page, 'select-trigger').click();
      await page.getByRole('listbox').waitFor();

      const result = await page.evaluate(() => {
        function walk(node: Document | ShadowRoot, selector: string): Element | null {
          const hit = node.querySelector(selector);
          if (hit) return hit;
          for (const el of Array.from(node.querySelectorAll('*'))) {
            if (el.shadowRoot) {
              const nested = walk(el.shadowRoot, selector);
              if (nested) return nested;
            }
          }
          return null;
        }
        const trigger = walk(document, '[data-testid="inline-select-trigger"]');
        const list = walk(document, '[role="listbox"]');
        if (!trigger || !list) return { found: false };
        const id = trigger.getAttribute('aria-controls');
        const root = trigger.getRootNode() as Document | ShadowRoot;
        return {
          found: true,
          sameRoot: list.getRootNode() === root,
          controls: id,
          // The decisive one: does the ID reference resolve where the
          // accessibility tree will look for it?
          resolves: id ? root.getElementById(id) !== null : false,
          // And it must NOT be in the overlay root, which is where every other
          // popup in the framework goes.
          inOverlayRoot: !!(list.getRootNode() as ShadowRoot).host?.hasAttribute?.(
            'data-mullion-overlay-root',
          ),
        };
      });

      expect(result.found, 'fixture did not render').toBe(true);
      expect(result.sameRoot, 'the listbox is in a different root from its trigger').toBe(true);
      expect(result.controls, 'the trigger does not name its listbox').toBeTruthy();
      expect(result.resolves, 'aria-controls names an id that does not resolve in the trigger’s root').toBe(true);
      expect(result.inOverlayRoot, 'the listbox was portaled into the overlay root').toBe(false);
    });
  }

  test('a searchable field’s active option resolves the same way', async ({ page }) => {
    await open(page);
    await inline(page, 'select-search').click();
    await page.getByRole('listbox').waitFor();
    await page.keyboard.press('ArrowDown');

    const result = await page.evaluate(() => {
      function walk(node: Document | ShadowRoot, selector: string): Element | null {
        const hit = node.querySelector(selector);
        if (hit) return hit;
        for (const el of Array.from(node.querySelectorAll('*'))) {
          if (el.shadowRoot) {
            const nested = walk(el.shadowRoot, selector);
            if (nested) return nested;
          }
        }
        return null;
      }
      const input = walk(document, '[data-testid="inline-select-search"]');
      if (!input) return { found: false };
      const active = input.getAttribute('aria-activedescendant');
      const root = input.getRootNode() as Document | ShadowRoot;
      return { found: true, active, resolves: active ? root.getElementById(active) !== null : false };
    });

    expect(result.found).toBe(true);
    // A combobox with an input navigates by id, not by moving focus. This is
    // the exact wiring the product's dropdowns get wrong.
    expect(result.active, 'no active option is named after ArrowDown').toBeTruthy();
    expect(result.resolves, 'aria-activedescendant names an id in another root').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The keyboard contract
// ---------------------------------------------------------------------------

test.describe('a keyboard can operate it', () => {
  test('arrow keys move the highlight and Enter commits', async ({ page }) => {
    await open(page);
    const trigger = inline(page, 'select-trigger');
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('listbox').waitFor();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(trigger).toContainText(/Administrator|Editor|Viewer/);
    await expect(trigger).toBeFocused();
  });

  test('Escape closes and returns focus across the shadow boundary', async ({ page }) => {
    await open(page);
    const trigger = inline(page, 'select-trigger');
    await trigger.click();
    await page.getByRole('listbox').waitFor();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('typing filters a searchable field and Enter picks the match', async ({ page }) => {
    await open(page);
    const input = inline(page, 'select-search');
    await input.click();
    await page.getByRole('listbox').waitFor();
    await input.pressSequentially('georg', { delay: 20 });
    await expect(page.getByRole('option')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Georgia');
  });

  test('a tags input adds what was typed', async ({ page }) => {
    await open(page);
    const input = inline(page, 'tags-input');
    await input.click();
    await input.fill('landscape');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Remove landscape' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// What it paints
// ---------------------------------------------------------------------------

test.describe('the painted result', () => {
  test('the highlighted row takes a rail and moves no ground', async ({ page }) => {
    await open(page);
    await inline(page, 'select-trigger').focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('listbox').waitFor();

    const measured = await page.evaluate(() => {
      function walk(node: Document | ShadowRoot, selector: string): Element[] {
        const hits = Array.from(node.querySelectorAll(selector));
        for (const el of Array.from(node.querySelectorAll('*'))) {
          if (el.shadowRoot) hits.push(...walk(el.shadowRoot, selector));
        }
        return hits;
      }
      const rows = walk(document, '.mullion-select-item') as HTMLElement[];
      const highlighted = rows.find((r) => r.hasAttribute('data-highlighted'));
      const resting = rows.find((r) => !r.hasAttribute('data-highlighted'));
      if (!highlighted || !resting) return null;
      const rail = getComputedStyle(highlighted, '::before');
      return {
        highlightedGround: getComputedStyle(highlighted).backgroundColor,
        restingGround: getComputedStyle(resting).backgroundColor,
        railWidth: rail.width,
        railColor: rail.backgroundColor,
        ringShadow: getComputedStyle(highlighted).boxShadow,
      };
    });

    expect(measured, 'no highlighted row was found').not.toBeNull();
    // The property P80-A's rail bought and this batch keeps: no ground moves.
    expect(measured!.highlightedGround).toBe(measured!.restingGround);
    expect(measured!.railWidth).toBe('3px');
    expect(measured!.railColor).not.toBe('rgba(0, 0, 0, 0)');
    // A keyboard move focuses the row for real, so the inset ring paints too.
    expect(measured!.ringShadow).toContain('inset');
  });

  test('a selected row is marked by a shape as well as a colour', async ({ page }) => {
    await open(page);
    const trigger = inline(page, 'select-trigger');
    await trigger.click();
    await page.getByRole('option', { name: 'Editor' }).click();
    await trigger.click();

    const selected = page.getByRole('option', { name: 'Editor' });
    await expect(selected).toHaveAttribute('data-selected', '');
    await expect(selected.locator('.mullion-select-item-indicator')).toBeVisible();
  });

  test('the popup survives a hostile host', async ({ page }) => {
    // The P77-B probe: a transformed ancestor, the page scrolled, and a sticky
    // header at z-index 9999. An overlay escapes it by leaving the tree; a
    // listbox may not leave, so this is the case that has to be measured.
    await open(page, { host: 'hostile' });
    await page.mouse.wheel(0, 600);
    const trigger = inline(page, 'select-trigger');
    await trigger.click();
    const list = page.getByRole('listbox');
    await list.waitFor();

    const box = await list.boundingBox();
    expect(box, 'the listbox has no box').not.toBeNull();
    expect(box!.height, 'the listbox is collapsed or clipped to nothing').toBeGreaterThan(20);

    const onTop = await page.evaluate(() => {
      function walk(node: Document | ShadowRoot, selector: string): Element | null {
        const hit = node.querySelector(selector);
        if (hit) return hit;
        for (const el of Array.from(node.querySelectorAll('*'))) {
          if (el.shadowRoot) {
            const nested = walk(el.shadowRoot, selector);
            if (nested) return nested;
          }
        }
        return null;
      }
      const list = walk(document, '[role="listbox"]') as HTMLElement | null;
      if (!list) return { found: false };
      const rect = list.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + Math.min(12, rect.height / 2);
      // `elementsFromPoint` returns shadow hosts, so the popup's own host
      // counts as a hit even across the boundary.
      const stack = document.elementsFromPoint(x, y);
      const reached = stack.some((el) => el === list || el.contains(list) || list.contains(el)
        || (el as HTMLElement).shadowRoot?.contains(list));
      return { found: true, reached, top: stack[0]?.tagName ?? null };
    });

    expect(onTop.found).toBe(true);
    expect(onTop.reached, `something covers the listbox; topmost was ${onTop.top}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The structural axe gate
// ---------------------------------------------------------------------------

test.describe('the axe gate', () => {
  test('an open listbox has valid roles, names and ARIA', async ({ page }) => {
    await open(page, { mount: 'light' });
    await inline(page, 'select-trigger').click();
    await page.getByRole('listbox').waitFor();
    // As every scoped gate does since P80-F: scan after the open transition, and prove the scan reached it.
    await page
      .locator('.mullion-select-popup')
      .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));

    const results = await new AxeBuilder({ page })
      .include('[role="listbox"]')
      .analyze();
    const scanned = [...results.passes, ...results.violations].flatMap((r) => r.nodes);
    expect(scanned.some((n) => n.html.includes('role="listbox"')), 'axe never reached the listbox').toBe(true);

    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(
      serious,
      serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n'),
    ).toHaveLength(0);
  });
});
