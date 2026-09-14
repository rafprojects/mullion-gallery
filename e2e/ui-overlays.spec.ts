/**
 * P80-A: the overlays, proved where the things that matter are observable.
 *
 * The unit suite can say which container an element was portaled into and
 * which attribute it carries. It cannot say whether the popup is above a
 * host's sticky header, whether the ring actually paints, whether a token
 * resolved, or where focus went after Escape. All four are here, and the last
 * one is the defect the product has today: Mantine returns focus to a trigger
 * it can no longer see once the trigger is inside the gallery shadow root.
 *
 * The fixture is `src/ui/showcase/mount.tsx` with `?overlays=1`, which appends
 * the overlay section. Without that parameter the page renders exactly what it
 * rendered before P80-A, so the existing snapshot baselines are untouched.
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

async function open(
  page: Page,
  { mount = 'shadow', theme = 'default-dark', host = '' }: { mount?: Mount; theme?: string; host?: string } = {},
) {
  await serveShowcase(page);
  const hostParam = host ? `&host=${host}` : '';
  await page.goto(`/ui-showcase?overlays=1&mount=${mount}&chrome=lock&theme=${theme}${hostParam}`);
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-mullion-overlay-root]');
    return !!root?.shadowRoot?.querySelector('[data-testid="overlay-panel"]');
  });
}

/**
 * The showcase's inline set is inside the gallery shadow root on a shadow
 * mount. Playwright pierces open shadow roots for `locator`, so a test id is
 * addressable either way; this helper exists to say which tree is meant.
 */
const inline = (page: Page, id: string) => page.locator(`[data-testid="inline-${id}"]`);

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
// The portal container
// ---------------------------------------------------------------------------

test.describe('every overlay lands in the provider’s container', () => {
  for (const mount of ['shadow', 'light'] as const) {
    test(`a modal opened from the ${mount} mount renders in the overlay root`, async ({ page }) => {
      await open(page, { mount });
      await inline(page, 'modal-trigger').click();

      const where = await page.evaluate(() => {
        const overlayRoot = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
        const popup = overlayRoot?.querySelector('.mullion-modal');
        return {
          inOverlayRoot: !!popup,
          directChildOfBody: !!document.body.querySelector(':scope > .mullion-modal'),
        };
      });
      expect(where.inOverlayRoot, 'the modal is not in the overlay root').toBe(true);
      expect(where.directChildOfBody, 'the modal leaked into document.body').toBe(false);
    });
  }

  test('a menu, a popover and a tooltip all portal to the same container', async ({ page }) => {
    await open(page);

    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('Escape');

    await inline(page, 'popover-trigger').click();
    await expect(page.locator('.mullion-popover')).toBeVisible();
    await page.keyboard.press('Escape');

    await inline(page, 'tooltip-trigger').hover();
    await expect(page.locator('.mullion-tooltip')).toBeVisible();

    const strays = await page.evaluate(
      () => document.body.querySelectorAll(':scope > .mullion-menu, :scope > .mullion-popover, :scope > .mullion-tooltip').length,
    );
    expect(strays, 'a popup rendered straight into document.body, where no tokens reach it').toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Focus: the defect this phase exists to remove
// ---------------------------------------------------------------------------

test.describe('focus', () => {
  test('returns to a trigger inside the gallery shadow root after Escape', async ({ page }) => {
    await open(page, { mount: 'shadow' });
    const trigger = inline(page, 'modal-trigger');
    await trigger.focus();
    await trigger.click();
    await expect(page.locator('.mullion-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.mullion-modal')).toBeHidden();

    // `document.activeElement` is the shadow HOST from the document's side, so
    // the check has to walk into the shadow root to see the real target. That
    // is exactly why this defect survives in the Mantine tree.
    const focused = await page.evaluate(() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active?.getAttribute('data-testid') ?? active?.tagName ?? null;
    });
    expect(focused, 'focus did not return to the trigger across the shadow boundary').toBe(
      'inline-modal-trigger',
    );
  });

  test('is trapped inside an open drawer', async ({ page }) => {
    await open(page);
    await inline(page, 'drawer-trigger').click();
    await expect(page.locator('.mullion-drawer')).toBeVisible();

    /*
     * Tab well past the drawer's own stops; focus must never leave it.
     *
     * The pause matters and is not padding. Base UI contains focus by letting
     * the browser move it to a guard and then redirecting, which settles over
     * a frame or two. Pressing Tab with no gap outruns that: the first draft
     * of this test sent twelve presses back to back and recorded three stops
     * on real buttons behind the drawer, which reads as a broken trap and is
     * actually a synthetic-input race. At a human cadence all twelve stay in.
     */
    const stops: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(120);
      stops.push(
        await page.evaluate(() => {
          let active: Element | null = document.activeElement;
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          if (!active) return 'none';
          return active.closest('.mullion-drawer')
            ? 'in'
            : `out:${active.tagName}:${(active.textContent ?? '').trim().slice(0, 20)}`;
        }),
      );
    }
    expect(stops.filter((s) => s !== 'in'), 'Tab escaped the drawer').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Dismissal
// ---------------------------------------------------------------------------

test.describe('dismissal', () => {
  test('Escape and an outside press both close a modal', async ({ page }) => {
    await open(page);

    await inline(page, 'modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mullion-modal')).toBeHidden();

    await inline(page, 'modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toBeVisible();
    await page.locator('.mullion-overlay-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.mullion-modal')).toBeHidden();
  });

  test('Escape closes a menu and returns focus to its trigger', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mullion-menu')).toBeHidden();

    const focused = await page.evaluate(() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active?.getAttribute('data-testid') ?? null;
    });
    expect(focused).toBe('inline-menu-trigger');
  });
});

// ---------------------------------------------------------------------------
// The P77-B hostile host
// ---------------------------------------------------------------------------

test.describe('a hostile host page', () => {
  test('a transformed ancestor and a sticky header do not capture the overlays', async ({ page }) => {
    await open(page, { host: 'hostile' });
    await page.evaluate(() => window.scrollTo(0, 600));

    await inline(page, 'modal-trigger').click();
    const popup = page.locator('.mullion-modal');
    await expect(popup).toBeVisible();

    const geometry = await page.evaluate(() => {
      /*
       * The fixture renders inside the gallery shadow root on a shadow mount,
       * so `document.querySelector` cannot see the header: it has to be found
       * through the root. Missing that is what made the first draft of this
       * test report "no modal" when the modal was there all along.
       */
      const deepFind = (selector: string): Element | null => {
        const roots: Array<Document | ShadowRoot> = [document];
        for (let i = 0; i < roots.length; i += 1) {
          const root = roots[i]!;
          const hit = root.querySelector(selector);
          if (hit) return hit;
          root.querySelectorAll('*').forEach((el) => {
            if (el.shadowRoot) roots.push(el.shadowRoot);
          });
        }
        return null;
      };

      const el = deepFind('.mullion-modal');
      const header = deepFind('[data-testid="hostile-header"]');
      if (!el || !header) return null;

      const box = el.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      /*
       * `elementsFromPoint` on the document returns shadow HOSTS, so the test
       * is which host paints on top at the header's own position: the overlay
       * root must come before the gallery host in the hit list.
       */
      const stack = document.elementsFromPoint(headerBox.left + 8, headerBox.top + headerBox.height / 2);
      const overlayIndex = stack.findIndex((n) => n.hasAttribute?.('data-mullion-overlay-root'));
      const galleryIndex = stack.findIndex((n) => n.id === 'showcase');
      return {
        top: box.top,
        viewport: window.innerHeight,
        overlayIndex,
        galleryIndex,
      };
    });

    expect(geometry, 'the modal is not in the overlay root').not.toBeNull();
    // Resolved against the viewport, not against the transformed ancestor: a
    // captured `position: fixed` would put the popup 600px up the page.
    expect(geometry!.top).toBeGreaterThanOrEqual(-1);
    expect(geometry!.top).toBeLessThan(geometry!.viewport);
    expect(geometry!.overlayIndex, 'the overlay root does not paint at the header').toBeGreaterThanOrEqual(0);
    expect(
      geometry!.overlayIndex < geometry!.galleryIndex || geometry!.galleryIndex === -1,
      'the sticky header at z-index 9999 painted over the overlay',
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tokens and the ring
// ---------------------------------------------------------------------------

test.describe('the overlays read tokens, not fallbacks', () => {
  test('a menu takes its ground and its border from the theme’s component tokens', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();

    const reading = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const menu = root?.querySelector('.mullion-menu') as HTMLElement | null;
      if (!menu) return null;
      const cs = getComputedStyle(menu);
      const toRgb = (value: string) => {
        const probe = document.createElement('div');
        probe.style.color = value;
        menu.appendChild(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      };
      return {
        background: cs.backgroundColor,
        expectedBackground: toRgb(cs.getPropertyValue('--mullion-menu-bg').trim()),
        borderToken: cs.getPropertyValue('--mullion-menu-bd').trim(),
      };
    });

    expect(reading, 'no menu in the overlay root').not.toBeNull();
    expect(reading!.borderToken, 'the menu-bd token did not reach the popup').toMatch(/^#|^rgb/);
    expect(reading!.background).toBe(reading!.expectedBackground);
  });

  test('the scrim is the theme’s overlay token rather than a hard-coded black', async ({ page }) => {
    await open(page);
    await inline(page, 'modal-trigger').click();
    const backdrop = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const el = root?.querySelector('.mullion-overlay-backdrop') as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { painted: cs.backgroundColor, token: cs.getPropertyValue('--mullion-overlay-bg').trim() };
    });
    expect(backdrop).not.toBeNull();
    expect(backdrop!.token, 'the overlay-bg token did not reach the backdrop').not.toBe('');
    expect(backdrop!.painted).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('a highlighted row paints the rail, and its ground does not move', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();

    const before = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const row = root?.querySelector('.mullion-menu-item') as HTMLElement | null;
      return row ? getComputedStyle(row).backgroundColor : null;
    });

    await page.keyboard.press('ArrowDown');

    const after = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const row = root?.querySelector('.mullion-menu-item[data-highlighted]') as HTMLElement | null;
      if (!row) return null;
      const rail = getComputedStyle(row, '::before');
      return {
        background: getComputedStyle(row).backgroundColor,
        railWidth: rail.width,
        railColour: rail.backgroundColor,
        strokeToken: getComputedStyle(row).getPropertyValue('--mullion-color-primary-stroke').trim(),
      };
    });

    expect(after, 'no highlighted row after ArrowDown').not.toBeNull();
    // The whole point of the rail: highlighting a row moves no ground, so
    // nothing painted on it can be measured against a ground it was not
    // audited on.
    expect(after!.background, 'highlighting the row moved its ground').toBe(before);
    expect(parseFloat(after!.railWidth), 'the rail is not painted').toBeGreaterThan(0);
    expect(after!.railColour, 'the rail is not the audited stroke colour').not.toBe(
      'rgba(0, 0, 0, 0)',
    );
  });

  test('the inset ring on a menu row is painted, and not clipped', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');

    /*
     * Read back what was PAINTED, not what the inputs imply. The outset ring's
     * reach was reported as 10px by a test that added `outlineWidth`,
     * `outlineOffset` and the halo spread; the real figure is 6px, because the
     * outline sits inside the spread. This samples the row's own box instead.
     */
    const ring = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const item = root?.querySelector('.mullion-menu-item[data-highlighted]') as HTMLElement | null;
      const menu = root?.querySelector('.mullion-menu') as HTMLElement | null;
      if (!item || !menu) return null;
      const cs = getComputedStyle(item);
      const ib = item.getBoundingClientRect();
      const mb = menu.getBoundingClientRect();
      return {
        variant: item.getAttribute('data-mullion-focus'),
        outline: cs.outlineStyle,
        boxShadow: cs.boxShadow,
        insetCount: (cs.boxShadow.match(/inset/g) ?? []).length,
        // An inset ring is drawn within the row's own box, so it cannot be cut
        // by the menu however little room the row has.
        roomLeft: +(ib.left - mb.left).toFixed(1),
        roomRight: +(mb.right - ib.right).toFixed(1),
        rowWidth: +ib.width.toFixed(1),
      };
    });

    expect(ring, 'no highlighted row').not.toBeNull();
    expect(ring!.variant).toBe('inset');
    expect(ring!.outline, 'the inset variant must not also draw an outset outline').toBe('none');
    expect(ring!.insetCount, 'three inset bands, halo core halo').toBe(3);
    // The row still has almost no clearance; that is the point of the variant.
    expect(ring!.roomLeft).toBeLessThan(6);
    expect(ring!.boxShadow).not.toBe('none');
  });

  test('a keyboard-highlighted menu item paints the two-tone ring', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');

    const ring = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const item = root?.querySelector('.mullion-menu-item[data-highlighted]') as HTMLElement | null;
      if (!item) return null;
      const cs = getComputedStyle(item);
      return {
        hasFocusAttr: item.hasAttribute('data-mullion-focus'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
        haloToken: cs.getPropertyValue('--mullion-color-focus-halo').trim(),
      };
    });

    expect(ring, 'no highlighted menu item after ArrowDown').not.toBeNull();
    expect(ring!.hasFocusAttr, 'the item does not carry the attribute the ring rule keys on').toBe(true);
    /*
     * Both tones of the P77-F pair must be painted on a keyboard move. A row
     * takes the INSET variant, so the pair arrives as three inset bands rather
     * than an outline plus a halo: same two tokens, different geometry, and no
     * outset outline at all.
     */
    expect(ring!.outlineStyle, 'the inset variant must not also draw an outline').toBe('none');
    expect(ring!.haloToken, 'the halo token did not reach the item').toMatch(/^#[0-9a-f]{6}$/i);
    expect(ring!.boxShadow, 'the ring is not painted at all').not.toBe('none');
    expect(ring!.boxShadow, 'the pair is not drawn inward').toContain('inset');
  });
});

// ---------------------------------------------------------------------------
// The axe gate
// ---------------------------------------------------------------------------

/*
 * Scoped to the popup, not to the page.
 *
 * The showcase renders P79-C's whole presentational set beside the overlays,
 * and a full-page scan reports its violations rather than this track's: the
 * `FileButton`'s hidden `<input type="file">` has no accessible name, and the
 * fixture's tone probe puts a link inside muted text at 1.11:1. Both are real
 * and both are P79-C's; they are recorded in the phase document with a home
 * rather than absorbed into a P80-A gate that would then be measuring
 * something else. A full-page gate belongs with the surfaces Phase 81
 * migrates, where the page is a product screen rather than a fixture.
 */
test.describe('the axe gate', () => {
  /*
   * The overlay root is a shadow root, and axe's `include` does not cross one
   * with a plain selector: it reports "No elements found for include". The
   * array form is the shadow-piercing chain, host first.
   */
  const within = (selector: string): [string, string] => ['[data-mullion-overlay-root]', selector];

  const serious = (results: { violations: Array<{ impact?: string | null; id: string; nodes: unknown[] }> }) =>
    results.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`);

  test('an open modal has no critical or serious violations', async ({ page }) => {
    await open(page, { mount: 'light' });
    await inline(page, 'modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toBeVisible();

    const results = await new AxeBuilder({ page }).include(within('.mullion-overlay-popup')).analyze();
    expect(serious(results), 'axe found violations inside the modal').toEqual([]);
  });

  test('an open drawer has no critical or serious violations', async ({ page }) => {
    await open(page, { mount: 'light' });
    await inline(page, 'drawer-trigger').click();
    await expect(page.locator('.mullion-drawer')).toBeVisible();

    const results = await new AxeBuilder({ page }).include(within('.mullion-overlay-popup')).analyze();
    expect(serious(results), 'axe found violations inside the drawer').toEqual([]);
  });

  test('an open menu has no critical or serious violations', async ({ page }) => {
    await open(page, { mount: 'light' });
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();

    const results = await new AxeBuilder({ page }).include(within('.mullion-menu')).analyze();
    expect(serious(results), 'axe found violations inside the menu').toEqual([]);
  });

  test('an open popover has no critical or serious violations', async ({ page }) => {
    await open(page, { mount: 'light' });
    await inline(page, 'popover-trigger').click();
    await expect(page.locator('.mullion-popover')).toBeVisible();

    const results = await new AxeBuilder({ page }).include(within('.mullion-popover')).analyze();
    expect(serious(results), 'axe found violations inside the popover').toEqual([]);
  });
});
