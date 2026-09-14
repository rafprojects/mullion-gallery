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
  await page.locator('[data-testid="inline-toggles"]').waitFor();
  await page.locator('[data-testid="inline-gaps"]').waitFor();
}

const inline = (page: Page, id: string) => page.locator(`[data-testid="inline-${id}"]`);

/**
 * The showcase renders the set twice, once inline and once in the provider's
 * container, so every role query has to be scoped or it matches both. Playwright
 * reports that as a strict-mode violation rather than picking one, which is the
 * right failure and the reason this helper exists.
 */
const choices = (page: Page) => page.locator('[data-testid="inline-choices"]');
const toggles = (page: Page) => page.locator('[data-testid="inline-toggles"]');
const gaps = (page: Page) => page.locator('[data-testid="inline-gaps"]');

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
    await expect.poll(async () => (await read())?.dx ?? 99, { timeout: 3000 }).toBeLessThanOrEqual(1);

    const first = await read();
    expect(first, 'no indicator or no checked segment').not.toBeNull();
    expect(first!.label).toContain('grid');
    expect(first!.width, 'the indicator has no width').toBeGreaterThan(10);
    // Positioned from the measurement, so it lands on the segment. The
    // allowance is sub-pixel: the measurement is of the same border box the
    // indicator draws, which is why it is a fraction of a pixel and not the
    // four whole ones `offsetWidth` cost before.
    expect(first!.dx).toBeLessThanOrEqual(1);
    expect(first!.dw).toBeLessThanOrEqual(1);

    // The border is what makes it visible: `surfaceRaised` is identical to
    // `surface2` on 21 of the 23 bundled themes, so the ground alone is not a
    // signal on nearly any of them.
    expect(first!.border).toBe('1px');
    expect(first!.borderColor).not.toBe(first!.ground);

    await choices(page).getByRole('radio', { name: 'map' }).click();
    await expect.poll(async () => (await read())?.label).toContain('map');
    await expect.poll(async () => (await read())?.dx ?? 99, { timeout: 3000 }).toBeLessThanOrEqual(1);
    const moved = await read();
    expect(moved!.dw).toBeLessThanOrEqual(1);
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
// The choice controls
// ---------------------------------------------------------------------------

test.describe('the choice controls', () => {
  test('a checked box and a checked track paint the audited fill', async ({ page }) => {
    await open(page);
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
      const box = walk(document, '[data-testid="inline-checkbox"]') as HTMLElement | null;
      const track = walk(document, '[data-testid="inline-switch"]') as HTMLElement | null;
      const thumb = track?.querySelector('.mullion-switch-thumb') as HTMLElement | null;
      if (!box || !track || !thumb) return null;
      return {
        restingBox: getComputedStyle(box).backgroundColor,
        checkedTrack: getComputedStyle(track).backgroundColor,
        thumb: getComputedStyle(thumb).backgroundColor,
        trackChecked: track.hasAttribute('data-checked'),
      };
    });

    expect(state, 'the toggles did not render').not.toBeNull();
    expect(state!.trackChecked, 'the fixture switch should start on').toBe(true);
    // The checked track and the resting box must not be the same ground, or
    // the state is invisible. This is the check the segmented indicator failed.
    expect(state!.checkedTrack).not.toBe(state!.restingBox);
    expect(state!.thumb).not.toBe(state!.checkedTrack);
  });

  test('the slider shows its formatted value while the thumb has focus', async ({ page }) => {
    await open(page);
    const bubble = toggles(page).locator('.mullion-slider-value');
    await expect(bubble).toHaveCSS('visibility', 'hidden');

    // A keyboard interaction, because the bubble keys on `:focus-visible` and
    // a programmatic focus on a range input is not that.
    await toggles(page).getByRole('slider', { name: /opacity/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(bubble).toHaveCSS('visibility', 'visible');
    await expect(bubble).toHaveCSS('opacity', '1');
    await expect(bubble).toHaveText('55%');
  });

  test('a single-choice chip group is one tab stop with arrow keys', async ({ page }) => {
    await open(page);
    const group = toggles(page).locator('[data-testid="inline-chip-group"]');
    const all = group.getByRole('radio', { name: 'all' });
    const mine = group.getByRole('radio', { name: 'mine' });

    await all.focus();
    await page.keyboard.press('ArrowRight');
    // Native radio behaviour: the arrow key moves and selects in one move.
    await expect(mine).toBeChecked();
    await expect(mine).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// The two gaps Base UI does not fill
// ---------------------------------------------------------------------------

test.describe('the colour picker', () => {
  test('a pointer on the surface picks the colour under it', async ({ page }) => {
    // The surface is the one piece of pointer-and-rect code in the framework
    // that is not the primitive's, so the browser is where it means anything:
    // jsdom reports every box as zero and the arithmetic would read as correct
    // against a zero-sized rect.
    await open(page);
    await gaps(page).getByRole('button', { name: /open the colour picker/i }).click();
    const surface = page.getByRole('slider', { name: /saturation/i });
    await surface.waitFor();

    const box = (await surface.boundingBox())!;
    expect(box.width, 'the surface has no width to measure against').toBeGreaterThan(50);

    // The top-right corner is full saturation at full brightness, which is the
    // pure hue whatever the hue happens to be.
    await page.mouse.move(box.x + box.width - 2, box.y + 2);
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(async () => surface.getAttribute('aria-valuetext'))
      .toMatch(/saturation 9[0-9]%|saturation 100%/);

    // The bottom-left corner is no saturation and no brightness: black.
    await page.mouse.move(box.x + 2, box.y + box.height - 2);
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(async () => surface.getAttribute('aria-valuetext')).toMatch(/brightness [0-9]%/);
  });

  test('the field round-trips what the picker reports', async ({ page }) => {
    await open(page);
    const field = gaps(page).getByRole('textbox');
    await expect(field).toHaveValue('rgba(18, 52, 86, 0.5)');

    await gaps(page).getByRole('button', { name: /open the colour picker/i }).click();
    await page.getByRole('button', { name: 'Use #ffffff' }).click();
    await expect(field).toHaveValue('rgba(255, 255, 255, 1)');
  });

  test('the hue rail paints the spectrum rather than a theme colour', async ({ page }) => {
    await open(page);
    await gaps(page).getByRole('button', { name: /open the colour picker/i }).click();
    const track = page.locator('.mullion-color-hue .mullion-slider-track');
    await track.waitFor();
    const background = await track.evaluate((el) => getComputedStyle(el).backgroundImage);
    // A hue rail that is not the spectrum lies about what it selects, which is
    // why this is the one sheet allowed a colour literal.
    expect(background).toContain('linear-gradient');
    expect(background).toContain('rgb(255, 0, 0)');
    expect(background).toContain('rgb(0, 0, 255)');
  });
});

test.describe('pagination', () => {
  test('keeps its width as the current page moves', async ({ page }) => {
    // A range that grows and shrinks makes the control reflow under the
    // pointer between clicks, so the next number is not where the user aimed.
    await open(page);
    const nav = gaps(page).getByRole('navigation');
    const before = (await nav.boundingBox())!.width;
    await nav.getByRole('button', { name: 'Next page' }).click();
    await expect(nav.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page');
    const after = (await nav.boundingBox())!.width;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  });

  test('the current page is filled and takes the outset ring', async ({ page }) => {
    await open(page);
    const nav = gaps(page).getByRole('navigation');
    const current = nav.locator('[data-active]');
    const resting = nav.getByRole('button', { name: 'Page 1' });

    const paint = await current.evaluate((el) => ({
      ground: getComputedStyle(el).backgroundColor,
      ink: getComputedStyle(el).color,
    }));
    const plain = await resting.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(paint.ground).not.toBe(plain);
    expect(paint.ink).not.toBe(paint.ground);

    await current.focus();
    const ring = await current.evaluate((el) => getComputedStyle(el).boxShadow);
    // Rule 8: a filled control keeps the outset ring, and these sit in a gap
    // so it has the clearance it needs.
    expect(ring).not.toContain('inset');
    expect(ring).not.toBe('none');
  });
});

// ---------------------------------------------------------------------------
// The structural axe gate
// ---------------------------------------------------------------------------

test.describe('the axe gate', () => {
  test('all three have valid roles, names and ARIA', async ({ page }) => {
    await open(page, { mount: 'light' });
    const results = await new AxeBuilder({ page })
      .include('[data-testid="inline-choices"]')
      .include('[data-testid="inline-toggles"]')
      .include('[data-testid="inline-gaps"]')
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious, serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')).toHaveLength(0);
  });
});
