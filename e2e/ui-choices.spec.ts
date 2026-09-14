/**
 * P80-B: tabs, the segmented control and the accordion, proved where the
 * measurement lives.
 *
 * Two things here cannot be proved in jsdom, and both are the reason these
 * components were the ones P77-C found broken:
 *
 *  - the segmented control's indicator is positioned from a measurement of the
 *    checked segment, and jsdom reports every box as zero, so its position is
 *    only meaningful in a browser;
 *  - the tab bar's active underline, its 1px rule and the weight of the active
 *    label are all cascade questions, and the cascade is exactly what P77-C's
 *    three dead rules lost. A computed style is the only thing that settles it.
 *
 * The fixture is `src/ui/showcase/mount.tsx` with `?choice=1`, opt-in so the
 * existing snapshot baselines render what they rendered before.
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
    const index = await (await route.fetch({ url: `${origin}/` })).text();
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

async function open(page: Page, { mount = 'shadow', theme = 'default-dark' }: { mount?: Mount; theme?: string } = {}) {
  await serveShowcase(page);
  await page.goto(`/ui-showcase?choice=1&mount=${mount}&chrome=lock&theme=${theme}`);
  await page.locator('[data-testid="inline-choices"]').waitFor();
}

const inline = (page: Page, id: string) => page.locator(`[data-testid="inline-${id}"]`);

/**
 * The showcase renders the set twice, once inline and once in the provider's
 * container, so every role query has to be scoped or it matches both. Playwright
 * reports that as a strict-mode violation rather than picking one, which is the
 * right failure and the reason this helper exists.
 */
const choices = (page: Page) => page.locator('[data-testid="inline-choices"]');

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
// The segmented indicator
// ---------------------------------------------------------------------------

test.describe('the segmented control’s indicator', () => {
  test('sits over the checked segment and follows it', async ({ page }) => {
    await open(page);

    const read = () =>
      page.evaluate(() => {
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
        const root = walk(document, '[data-testid="inline-segmented"]') as HTMLElement | null;
        if (!root) return null;
        const indicator = root.querySelector('.mullion-segmented-indicator') as HTMLElement | null;
        const checked = root.querySelector('[data-checked]') as HTMLElement | null;
        if (!indicator || !checked) return null;
        const i = indicator.getBoundingClientRect();
        const c = checked.getBoundingClientRect();
        const style = getComputedStyle(indicator);
        return {
          label: checked.textContent,
          dx: Math.abs(i.left - c.left),
          dw: Math.abs(i.width - c.width),
          width: i.width,
          border: style.borderTopWidth,
          borderColor: style.borderTopColor,
          ground: style.backgroundColor,
        };
      });

    // The indicator transitions when it moves, so a reading taken mid-slide
    // measures the animation rather than the result. Poll for the settled box.
    await expect.poll(async () => (await read())?.dx ?? 99, { timeout: 3000 }).toBeLessThanOrEqual(3);

    const first = await read();
    expect(first, 'no indicator or no checked segment').not.toBeNull();
    expect(first!.label).toContain('grid');
    expect(first!.width, 'the indicator has no width').toBeGreaterThan(10);
    // Positioned from the measurement, so it should land on the segment. The
    // 2px allowance is the track's own padding and the indicator's border.
    expect(first!.dx).toBeLessThanOrEqual(3);
    expect(first!.dw).toBeLessThanOrEqual(3);

    // The border is what makes it visible: `surfaceRaised` is identical to
    // `surface2` on 21 of the 23 bundled themes, so the ground alone is not a
    // signal on nearly any of them.
    expect(first!.border).toBe('1px');
    expect(first!.borderColor).not.toBe(first!.ground);

    await choices(page).getByRole('radio', { name: 'map' }).click();
    await expect.poll(async () => (await read())?.label).toContain('map');
    await expect.poll(async () => (await read())?.dx ?? 99, { timeout: 3000 }).toBeLessThanOrEqual(3);
    const moved = await read();
    expect(moved!.dw).toBeLessThanOrEqual(3);
  });

  test('a keyboard moves it, and the segment keeps a ring', async ({ page }) => {
    await open(page);
    await choices(page).getByRole('radio', { name: 'grid' }).focus();
    await page.keyboard.press('ArrowRight');

    const state = await page.evaluate(() => {
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
      const root = walk(document, '[data-testid="inline-segmented"]') as HTMLElement | null;
      const checked = root?.querySelector('[data-checked]') as HTMLElement | null;
      if (!checked) return null;
      return { label: checked.textContent, shadow: getComputedStyle(checked).boxShadow };
    });

    expect(state!.label).toContain('list');
    expect(state!.shadow, 'a focused segment paints no ring').toContain('inset');
  });
});

// ---------------------------------------------------------------------------
// The tab bar, which is where three rules died in P77-C
// ---------------------------------------------------------------------------

test.describe('the tab bar', () => {
  test('the active label is heavier and the underline sits on the rule', async ({ page }) => {
    await open(page);

    const measured = await page.evaluate(() => {
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
      const list = walk(document, '[data-testid="inline-tabs-list"]') as HTMLElement | null;
      if (!list) return null;
      const active = list.querySelector('.mullion-tabs-tab[data-active]') as HTMLElement | null;
      const resting = list.querySelector('.mullion-tabs-tab:not([data-active])') as HTMLElement | null;
      const indicator = list.querySelector('.mullion-tabs-indicator') as HTMLElement | null;
      if (!active || !resting || !indicator) return null;
      const listRect = list.getBoundingClientRect();
      const tabRect = active.getBoundingClientRect();
      const indRect = indicator.getBoundingClientRect();
      return {
        activeWeight: Number(getComputedStyle(active).fontWeight),
        restingWeight: Number(getComputedStyle(resting).fontWeight),
        activeColor: getComputedStyle(active).color,
        restingColor: getComputedStyle(resting).color,
        rule: getComputedStyle(list).borderBottomWidth,
        indicatorColor: getComputedStyle(indicator).backgroundColor,
        dx: Math.abs(indRect.left - tabRect.left),
        dw: Math.abs(indRect.width - tabRect.width),
        seated: Math.abs(indRect.bottom - listRect.bottom),
      };
    });

    expect(measured, 'the tab bar did not render').not.toBeNull();
    // The P77-C defect was the active colour and weight never painting.
    expect(measured!.activeWeight).toBeGreaterThan(measured!.restingWeight);
    expect(measured!.activeColor).not.toBe(measured!.restingColor);
    expect(measured!.rule).toBe('1px');
    expect(measured!.indicatorColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(measured!.dx).toBeLessThanOrEqual(2);
    expect(measured!.dw).toBeLessThanOrEqual(2);
    // It seats on the list's rule rather than floating above it.
    expect(measured!.seated).toBeLessThanOrEqual(2);
  });

  test('arrowing moves focus without switching the panel, and Enter switches it', async ({ page }) => {
    await open(page);
    await inline(page, 'tab-one').focus();
    await page.keyboard.press('ArrowRight');

    // The outgoing panel stays in the DOM while it transitions out, marked
    // `inert`, so the live panel is the one that is not.
    const live = choices(page).locator('[role="tabpanel"]:not([inert])');
    await expect(inline(page, 'tab-two')).toBeFocused();
    await expect(live).toHaveText('first panel');

    await page.keyboard.press('Enter');
    await expect(live).toHaveText('second panel');
  });

  test('the underline follows a switch', async ({ page }) => {
    await open(page);
    const before = await inline(page, 'tabs-list').evaluate(
      (el) => (el.querySelector('.mullion-tabs-indicator') as HTMLElement).getBoundingClientRect().left,
    );
    await inline(page, 'tab-two').click();
    await expect
      .poll(async () =>
        inline(page, 'tabs-list').evaluate(
          (el) => (el.querySelector('.mullion-tabs-indicator') as HTMLElement).getBoundingClientRect().left,
        ),
      )
      .not.toBe(before);
  });
});

// ---------------------------------------------------------------------------
// The accordion
// ---------------------------------------------------------------------------

test.describe('the accordion', () => {
  test('opens and closes on its measured height', async ({ page }) => {
    // A closed panel is not rendered at all: Base UI unmounts it unless
    // `keepMounted` is set, so the assertion is presence and then height, not
    // a height of zero on something that is not there.
    await open(page);
    const panels = choices(page).locator('.mullion-accordion-panel');
    await expect(panels).toHaveCount(1);

    await inline(page, 'accordion-b').click();
    await expect.poll(async () => (await panels.first().boundingBox())?.height ?? 0).toBeGreaterThan(10);
    await expect(panels).toHaveCount(1);
    await expect(choices(page).getByText('behaviour body')).toBeVisible();
  });

  test('the control takes the outset ring, which its clearance allows', async ({ page }) => {
    await open(page);
    await inline(page, 'accordion-a').focus();
    const ring = await inline(page, 'accordion-a').evaluate((el) => {
      const style = getComputedStyle(el);
      return { outline: style.outlineWidth, shadow: style.boxShadow };
    });
    expect(ring.outline).toBe('2px');
    expect(ring.shadow, 'the outset halo is missing').not.toBe('none');
    expect(ring.shadow, 'an accordion control should not take the inset variant').not.toContain('inset');
  });
});

// ---------------------------------------------------------------------------
// The structural axe gate
// ---------------------------------------------------------------------------

test.describe('the axe gate', () => {
  test('all three have valid roles, names and ARIA', async ({ page }) => {
    await open(page, { mount: 'light' });
    const results = await new AxeBuilder({ page }).include('[data-testid="inline-choices"]').analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious, serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')).toHaveLength(0);
  });
});
